"""Build the gallery from curated data and the evolved original gallery template."""
import argparse
import base64
import json
import os
from zipfile import ZipFile, ZIP_DEFLATED
from pathlib import Path
from validate_catalog import validate
from version_rank_demo import refresh
from collect_csa import collect

ROOT = Path(__file__).resolve().parents[1]


def design_system_markup(mode):
    if mode == 'pto':
        base = 'vendor/pto-design-system/'
        return '\n'.join(f'<link rel="stylesheet" href="{base}{path}">' for path in ['tokens/foundation.css', 'tokens/semantic.css', 'tokens/components.css', 'css/style.css'])
    local_config = ROOT / '.local/sources.json'
    assert local_config.is_file(), 'standalone build requires .local/sources.json'
    design_system = Path(json.loads(local_config.read_text())['designSystem'])
    paths = ['tokens/foundation.css', 'tokens/semantic.css', 'tokens/components.css', 'css/style.css']
    css = []
    for path in paths:
        source = (design_system / path).read_text()
        if path == 'css/style.css':
            source = '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith('@import'))
        css.append(f'/* PTO design system · {path} */\n{source}')
    return '<style>\n' + '\n'.join(css) + '\n</style>'


def build(mode='standalone', service='http://127.0.0.1:8766/', collection='knowledge'):
    refresh(ROOT)
    data = json.loads((ROOT / 'catalog/assets.json').read_text())
    validate(data)
    template = (ROOT / 'web/index.template.html').read_text()
    if collection == 'skills':
        template = template.replace('<title>AI Infra 设计知识库</title>', '<title>AI Infra Skill 库</title>')
    if collection == 'patterns':
        template = template.replace('<title>AI Infra 设计知识库</title>', '<title>AI Infra Pattern 库</title>')
    config = {'mode': mode, 'serviceBase': service if mode == 'pto' else './', 'ptoBase': './' if mode == 'pto' else None}
    config['collection'] = collection
    if collection == 'skills':
        from skill_readme import render as render_skill_readme
        config['skillReadmes'] = {a['id']: render_skill_readme((ROOT / a['readmePath']).read_text(), a['readmePath']) for a in data['assets'] if a['type'] == 'method' and a.get('readmePath')}
        config['skillTexts'] = {a['id']: (ROOT / a['content']).read_text() for a in data['assets'] if a['type'] == 'method'}
    if mode == 'standalone':
        repositories = json.loads((ROOT / '.local/sources.json').read_text())['repositories']
        config['fileRoots'] = {key: Path(os.path.relpath(value, ROOT)).as_posix() + '/' for key, value in repositories.items()}
    residual_svg = base64.b64encode((ROOT / 'web/media/ds32_residual_architecture_main.svg').read_bytes()).decode('ascii')
    pangu_research_p7 = base64.b64encode((ROOT / 'web/media/pangu-research-p7.png').read_bytes()).decode('ascii')
    hw_native_lingqu = base64.b64encode((ROOT / 'web/media/hw-native-lingqu-l7-l0.svg').read_bytes()).decode('ascii')
    transformer_layer_cover = base64.b64encode((ROOT / 'web/media/transformer-layer-cover.svg').read_bytes()).decode('ascii')
    replacements = {
        '<!-- DESIGN_SYSTEM -->': design_system_markup(mode),
        '/* GALLERY_CSS */': (ROOT / 'web/gallery.css').read_text(),
        '/* CATALOG_JSON */': json.dumps(data, ensure_ascii=False).replace('<', '\\u003c'),
        '/* CONFIG_JSON */': json.dumps(config).replace('<', '\\u003c'),
        '/* CORE_JS */': (ROOT / 'web/catalog-core.js').read_text(),
        '/* APP_JS */': (ROOT / 'web/gallery.js').read_text(),
        '__REDUCTION_MEMORY_INSPECTOR_COVER__': 'data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/reduction-memory-inspector-cover.png').read_bytes()).decode('ascii'),
        '__PAGED_ATTENTION_GRAPH_COVER__': 'data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/paged-attention-graph-cover.png').read_bytes()).decode('ascii'),
        '__MODEL_ARCHITECTURE_V4_COVER__': 'data:image/jpeg;base64,' + base64.b64encode((ROOT / 'web/media/model-architecture-v4-cover.jpg').read_bytes()).decode('ascii'),
        '__CSA_SWIMLANE_COVER__': 'data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/csa-swimlane-cover.png').read_bytes()).decode('ascii'),
        '__MODEL_ARCHITECTURE_V41_COVER__': 'data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/model-architecture-v41-cover.png').read_bytes()).decode('ascii'),
        '__CRITICAL_PATH_SWIMLANE_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/critical-path-swimlane-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__UNPACK_MAPPING_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/unpack-mapping-inspector-cover.svg').read_bytes()).decode('ascii'),
        '__UNPACK_CASE3_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/unpack-case3-inspector-cover.svg').read_bytes()).decode('ascii'),
        '__SCALE_BROADCAST_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/scale-broadcast-inspector-cover.svg').read_bytes()).decode('ascii'),
        '__RMSNORM_REUSE_COVER__': 'data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/rmsnorm-residency-reuse-cover.png').read_bytes()).decode('ascii'),
        '__RSFA_PERFORMANCE_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/rsfa-performance-comparison-cover.svg').read_bytes()).decode('ascii'),
        '__EXPAND_MAPPING_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/expand-mapping-inspector-cover.svg').read_bytes()).decode('ascii'),
        '__MEMORY_INSPECTOR_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/memory-inspector-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__PASS_ERROR_CASES_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/pass-error-cases-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__CSA_PASS_FIELD_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/csa-pass-field-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__ATLAS_ANATOMY_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/atlas-950-anatomy-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__ATLAS_950_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/atlas-950-explorer-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__PYPTO_GUIDES_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/pypto-guides-cover.svg').read_bytes()).decode('ascii'),
        '__PYPTO_COMPILATION_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/pypto-compilation-guide-cover.svg').read_bytes()).decode('ascii'),
        '__NPU_MEMORY_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/npu-memory-atlas-training-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__PANGU_LAYER_ATLAS_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/pangu-layer-atlas-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__PANGU_LAYER_ATLAS_2_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/pangu-layer-atlas-2-cover.png').read_bytes()).decode('ascii')) if collection == 'patterns' else '',
        '__LLM_INFERENCE_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/llm-inference-cover.svg').read_bytes()).decode('ascii'),
        '__TRAINING_PARALLEL_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/training-parallel-communication-cover.svg').read_bytes()).decode('ascii'),
        '__OBSERVABILITY_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/observability-design-style.png').read_bytes()).decode('ascii')) if collection == 'skills' else '',
        '__SPATIAL_SYSTEMS_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/spatial-systems-ui-style-guide.png').read_bytes()).decode('ascii')) if collection == 'skills' else '',
        '__LLM_SKILL_COVER__': ('data:image/png;base64,' + base64.b64encode((ROOT / 'web/media/llm-compute-diagrams.png').read_bytes()).decode('ascii')) if collection == 'skills' else '',
        '__DENSE_MOE_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/dense-ffn-to-moe-cover.svg').read_bytes()).decode('ascii'),
        '__DS32_RESIDUAL_THUMBNAIL__': f'data:image/svg+xml;base64,{residual_svg}',
        '__PANGU_RESEARCH_P7_THUMBNAIL__': f'data:image/png;base64,{pangu_research_p7}',
        '__HW_NATIVE_LINGQU_THUMBNAIL__': f'data:image/svg+xml;base64,{hw_native_lingqu}',
        '__TRANSFORMER_LAYER_COVER__': f'data:image/svg+xml;base64,{transformer_layer_cover}',
    }
    replacements.update({'__PASS_OBSERVABILITY_COVER__': 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'web/media/pass-observability-cover.svg').read_bytes()).decode('ascii'),})
    for marker, value in replacements.items():
        assert template.count(marker) == 1, f'missing or duplicate marker: {marker}'
        template = template.replace(marker, value)
    return template


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pto-output', type=Path, help='explicit generated compatibility page output')
    parser.add_argument('--service-url', default='http://127.0.0.1:8766/')
    args = parser.parse_args()
    collect()
    from collect_operator_mapping import collect as collect_operator_mapping
    collect_operator_mapping()
    from collect_rmsnorm_pattern import collect as collect_rmsnorm_pattern
    collect_rmsnorm_pattern()
    from collect_trial_patterns import collect as collect_trial_patterns
    collect_trial_patterns()
    from package_investigation import package as package_investigation
    package_investigation()
    packages = [('methods/llm-compute-diagrams', 'methods/llm-compute-diagrams.zip')]
    data = json.loads((ROOT / 'catalog/assets.json').read_text())
    validate(data)
    packages.extend((a['packagePath'], a['downloadUrl']) for a in data['assets'] if a.get('packagePath'))
    for package_path, download_url in packages:
        skill_root = ROOT / package_path
        with ZipFile(ROOT / download_url, 'w', ZIP_DEFLATED) as archive:
            for file in sorted(skill_root.rglob('*')):
                if file.is_file() and not any(part.startswith('.') for part in file.relative_to(skill_root).parts):
                    archive.write(file, file.relative_to(skill_root.parent))
    (ROOT / 'index.html').write_text(build(), encoding='utf-8')
    (ROOT / 'skills.html').write_text(build(collection='skills'), encoding='utf-8')
    (ROOT / 'patterns.html').write_text(build(collection='patterns'), encoding='utf-8')
    if args.pto_output:
        args.pto_output.write_text(build('pto', args.service_url.rstrip('/') + '/'), encoding='utf-8')
    print('Built index.html, skills.html, patterns.html and Skill ZIP' + (' and PTO compatibility page' if args.pto_output else ''))
