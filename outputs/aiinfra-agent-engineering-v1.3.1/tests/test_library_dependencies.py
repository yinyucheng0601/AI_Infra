from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from adapters.library_dependencies import collect_files


class LibraryDependencyTests(unittest.TestCase):
    def test_fetch_and_stylesheet_use_their_respective_browser_bases(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'styles').mkdir()
            (root / 'index.html').write_text(
                '<script src="scripts/app.js"></script><link rel="stylesheet" href="styles/site.css">')
            (root / 'scripts/app.js').write_text("fetch( 'data.json?v=8')")
            (root / 'styles/site.css').write_text('main { background: url(tile.svg) }')
            (root / 'styles/tile.svg').touch()
            (root / 'data.json').write_text('{}')
            files, missing, external = collect_files(root, ['index.html'], browser_resolution=True)
            self.assertEqual(set(files), {
                'index.html', 'scripts/app.js', 'styles/site.css', 'styles/tile.svg', 'data.json',
            })
            self.assertEqual((missing, external), ([], []))

            files, missing, _ = collect_files(
                root, ['index.html'], browser_resolution=True, exclude=lambda path: path.name == 'app.js')
            self.assertNotIn('scripts/app.js', files)
            self.assertNotIn('data.json', files)
            self.assertEqual(missing, ['scripts/app.js'])
