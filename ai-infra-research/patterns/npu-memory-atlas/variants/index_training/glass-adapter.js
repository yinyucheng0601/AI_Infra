/* Only material bindings. Runtime, optical maps and defaults are the final v2
 * pattern, copied verbatim by build.py and tracked in provenance.json. */
(()=>{
 const glass=window.LiquidGlassControls;
 document.querySelectorAll('.zoom-controls,.training-graph-entry').forEach(n=>glass.init(n,'control'));
 document.querySelectorAll('.rank-settings>button').forEach(n=>glass.init(n,'icon'));
 document.querySelectorAll('.rank-settings-panel,.shard-inspector,#tensor-list,#training-help').forEach(n=>glass.init(n,'panel'));
 // Playback is bare canvas chrome: no backdrop, shine, fill or nested glass.
 document.querySelectorAll('#ep-playback [data-liquid-glass],#ep-playback[data-liquid-glass]').forEach(n=>glass.destroy(n));
})();
