"""Practice-folder settings (lab/python). Graded runs in the app do not use this file.

The lab keeps its Chromium inside the project (lab/.browsers, installed by `npm run lab:python-setup`),
so pytest finds it even when you run it yourself from an activated venv.
"""

import os
from pathlib import Path

LAB_BROWSERS = Path(__file__).resolve().parent.parent / ".browsers"

if LAB_BROWSERS.is_dir():
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(LAB_BROWSERS))
