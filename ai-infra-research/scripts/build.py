"""Build the gallery from curated data and the evolved original gallery template."""
import argparse
import base64
import json
from pathlib import Path
from validate_catalog import validate

ROOT = Path(__file__).resolve().parents[1]


def build(mode='standalone', service='http://127.0.0.1:8766/'):
    data = json.loads((ROOT / 'catalog/assets.json').read_text())
    validate(data)
    template = (ROOT / 'web/index.template.html').read_text()
    styles = 'vendor/pto-design-system/' if mode == 'pto' else 'design-system/'
    config = {'mode': mode, 'serviceBase': service if mode == 'pto' else './', 'ptoBase': './' if mode == 'pto' else None}
    residual_svg = base64.b64encode((ROOT / 'web/media/ds32_residual_architecture_main.svg').read_bytes()).decode('ascii')
    pangu_research_p7 = base64.b64encode((ROOT / 'web/media/pangu-research-p7.png').read_bytes()).decode('ascii')
    hw_native_lingqu = base64.b64encode((ROOT / 'web/media/hw-native-lingqu-l7-l0.svg').read_bytes()).decode('ascii')
    replacements = {
        '<!-- DESIGN_SYSTEM -->': '\n'.join(f'<link rel="stylesheet" href="{styles}{p}">' for p in ['tokens/foundation.css', 'tokens/semantic.css', 'tokens/components.css', 'css/style.css']),
        '/* GALLERY_CSS */': (ROOT / 'web/gallery.css').read_text(),
        '/* CATALOG_JSON */': json.dumps(data, ensure_ascii=False).replace('<', '\\u003c'),
        '/* CONFIG_JSON */': json.dumps(config),
        '/* CORE_JS */': (ROOT / 'web/catalog-core.js').read_text(),
        '/* APP_JS */': (ROOT / 'web/gallery.js').read_text(),
        '__DS32_RESIDUAL_THUMBNAIL__': f'data:image/svg+xml;base64,{residual_svg}',
        '__PANGU_RESEARCH_P7_THUMBNAIL__': f'data:image/png;base64,{pangu_research_p7}',
        '__HW_NATIVE_LINGQU_THUMBNAIL__': f'data:image/svg+xml;base64,{hw_native_lingqu}',
    }
    for marker, value in replacements.items():
        assert template.count(marker) == 1, f'missing or duplicate marker: {marker}'
        template = template.replace(marker, value)
    return template


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pto-output', type=Path, help='explicit generated compatibility page output')
    parser.add_argument('--service-url', default='http://127.0.0.1:8766/')
    args = parser.parse_args()
    (ROOT / 'index.html').write_text(build(), encoding='utf-8')
    if args.pto_output:
        args.pto_output.write_text(build('pto', args.service_url.rstrip('/') + '/'), encoding='utf-8')
    print('Built index.html' + (' and PTO compatibility page' if args.pto_output else ''))
