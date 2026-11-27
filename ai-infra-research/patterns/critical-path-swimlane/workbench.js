(function (global) {
  'use strict';

  function requireField(valid, field, message) {
    if (!valid) throw new Error(field + ' · ' + message);
  }

  function validateEvidence(data) {
    const evidence = data.evidence;
    requireField(evidence && /^trace:sha256:[a-f0-9]{64}$/.test(evidence.scope), 'evidence.scope', '需要固定采集指纹');
    requireField(evidence.clock === 'trace microseconds → milliseconds', 'evidence.clock', '需要该采集统一的毫秒时间轴');
    requireField(typeof data.run.provenanceFile === 'string' && /^[\w.-]+\.json$/.test(data.run.provenanceFile) &&
      Number.isFinite(data.run.request?.end) && data.run.request.end > 0,
    'data.run', '需要采集来源和完整时间窗');
    for (const key of ['records', 'links', 'requests', 'batchSamples', 'tokenSamples']) {
      requireField(Array.isArray(evidence[key]), 'evidence.' + key, '需要数组');
    }
    const records = new Map();
    for (const event of evidence.records) {
      requireField(/^raw-\d+$/.test(event.id) && !records.has(event.id), 'evidence.records', '无效或重复的事件 ID ' + event.id);
      requireField(typeof event.name === 'string' && event.args && typeof event.args === 'object' &&
        Number.isFinite(event.start) && Number.isFinite(event.end) && event.start <= event.end,
      'event ' + event.id, '缺少原始字段或时间区间无效');
      requireField((event.scope ?? evidence.scope) === evidence.scope &&
        (event.clock ?? evidence.clock) === evidence.clock, 'event ' + event.id, '采集或时钟域不匹配');
      records.set(event.id, event);
    }
    for (const step of data.steps) {
      requireField(step.invocation != null && Number.isFinite(step.absoluteStart) && step.absoluteEnd > step.absoluteStart &&
        Number.isFinite(step.absoluteEnd) && Array.isArray(step.rawEventIds) && step.rawEventIds.length,
      'steps.' + step.id, '需要对应调用组、完整时间窗与原始事件引用');
      for (const id of step.rawEventIds) {
        const event = records.get(id);
        requireField(event && (event.args.run_id === step.invocation ||
          (['bind', 'runner'].includes(event.track) && event.args.inv === step.invocation)),
        'steps.' + step.id, '事件未解析或不属于该调用组 ' + id);
      }
    }
    for (const request of evidence.requests) {
      requireField(typeof request.id === 'string' && Array.isArray(request.eventIds) && request.eventIds.length &&
        request.eventIds.every(id => records.get(id)?.args.request_id === request.id),
      'evidence.requests.' + request.id, '缺少同请求的原始事件');
      requireField(Number.isFinite(request.start) &&
        (request.queued == null || Number.isFinite(request.queued) && request.queued >= request.start) &&
        (request.end == null || Number.isFinite(request.end) && request.end >= (request.queued ?? request.start)),
      'evidence.requests.' + request.id, '生命周期顺序无效');
    }
    for (const sample of [...evidence.batchSamples, ...evidence.tokenSamples]) {
      requireField(records.has(sample.eventId), 'evidence.samples', '找不到来源 ' + sample.eventId);
    }
    for (const {from, to, basis, fields} of evidence.links) {
      const a = records.get(from), b = records.get(to);
      const key = 'evidence.links ' + from + ' → ' + to;
      requireField(a && b && a !== b && Array.isArray(fields), key, '端点或依据无效');
      const fieldSet = fields.join(',');
      let valid = false;
      if (basis === 'id-match') {
        if (fieldSet === 'request_ids,request_id') {
          valid = b.args.request_id != null && Array.isArray(a.args.request_ids) &&
            a.args.request_ids.includes(b.args.request_id);
        } else {
          const endpointTypes = {
            run_id: b.name === 'chip.run',
            'run_id,dispatch_id': b.name === 'chip.run',
            'pid,inv': a.name === 'chip.run' && ['bind', 'runner'].includes(b.track),
            'run_id,dispatch_id,worker_id': a.name === 'node.dispatch' && b.track === 'runtime',
            step_id: a.name === 'WorkerProcess.dispatch_decode' && b.track === 'orchestration',
          };
          const value = (event, field) => Object.hasOwn(event, field) ? event[field] : event.args[field];
          valid = endpointTypes[fieldSet] === true &&
            fields.every(field => value(a, field) != null && value(a, field) === value(b, field));
        }
      }
      if (basis === 'same-thread-containment') {
        const host = event => ['executor', 'orchestration'].includes(event.track);
        valid = fieldSet === 'pid,tid,interval' && host(a) && host(b) && a.pid === b.pid &&
          a.tid === b.tid && a.start <= b.start && a.end >= b.end &&
          (a.start < b.start || a.end > b.end);
      }
      if (basis === 'temporal-candidate') {
        const step = data.steps.find(item => item.invocation === b.args.run_id);
        valid = fieldSet === 'interval' && a.track === 'orchestration' && b.name === 'chip.run' && step &&
          data.run.workerGroups?.some(group => (group.step === step.id || group.steps?.includes(step.id)) &&
            data.run.workerEvents?.some(event => group.eventIds.includes(event.id) &&
              a.name === 'WorkerProcess.' + event.name && Math.abs(a.start - event.start) < .002));
      }
      requireField(valid, key, '关系类型、端点或原始依据不匹配');
    }
  }

  function resolve(data, call) {
    requireField(call?.version === 1, 'version', '使用版本 1');
    requireField(call.pattern === 'critical-path-swimlane', 'pattern', '使用 critical-path-swimlane');
    requireField(call.layout === 'investigation-workbench', 'layout', '使用 investigation-workbench');
    requireField(call.axis === 'trace-time', 'axis', '此资产使用毫秒 Trace 时间轴；源码步骤请选择其他 Pattern');
    requireField((data?.version === 1 || data?.version === 2) && data.run &&
      Array.isArray(data.steps) && data.steps.length,
      'data.steps', '需要现有泳道数据与至少一个调用组');
    const stepIds = new Set();
    for (const step of data.steps) {
      requireField(typeof step.id === 'string' && step.id && !stepIds.has(step.id) &&
        Array.isArray(step.lanes) && step.lanes.length === 16, 'data.steps', '需要唯一调用组 ID 和 16 条 lane');
      requireField(new Set(step.lanes.map(lane=>lane.dev)).size===16 && step.lanes.every(lane=>
        Number.isInteger(lane.dev) && lane.dev>=0 && lane.dev<16 &&
        [lane.bindStart,lane.bindEnd,lane.rrStart,lane.rrEnd,lane.end].every(Number.isFinite) &&
        lane.bindStart<=lane.bindEnd && lane.rrStart<=lane.rrEnd),
      'steps.' + step.id + '.lanes', '需要唯一 lane 和有效的调用时间窗');
      stepIds.add(step.id);
    }
    if (call.step != null) requireField(stepIds.has(call.step), 'step', '选择当前采集中的调用组');
    const trace = Boolean(data.evidence || data.run.provenanceFile || data.steps.some(step=>step.rawEventIds));
    if (trace) validateEvidence(data);
    requireField(call.controls == null || typeof call.controls === 'object' && !Array.isArray(call.controls),
      'controls', '需要控件名与 required 或 optional 的对应记录');
    const controls = {};
    const omitted = [];
    for (const [name, mode] of Object.entries(call.controls || {})) {
      requireField(['required', 'optional'].includes(mode), 'controls.' + name, '使用 required 或 optional');
      const supported = ['zoom', 'inspector'].includes(name) ||
        (name === 'eventEvidence' && trace) || (name === 'playback' && trace && data.steps.length > 1);
      if (supported) controls[name] = true;
      else if (mode === 'required') requireField(false, 'controls.' + name, '当前数据与渲染入口无法兑现此能力');
      else omitted.push(name);
    }
    return {trace, controls, omitted};
  }

  function mount(root, data, call, options = {}) {
    const {trace, controls, omitted} = resolve(data, call);
    const renderer = trace ? global.TraceEvidenceView : global.CriticalPathSwimlane;
    return Object.assign(renderer.mount(root, data, {...options, step: call.step ?? options.defaultStep, playback: controls.playback}), {omitted});
  }

  global.CriticalPathWorkbench = {resolve, mount};
})(typeof window === 'undefined' ? module.exports : window);
