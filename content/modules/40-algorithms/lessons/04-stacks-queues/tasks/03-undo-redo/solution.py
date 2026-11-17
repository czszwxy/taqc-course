class Editor:
    def __init__(self):
        self.text = ""
        self._undo = []
        self._redo = []

    def _change(self, new_text):
        self._undo.append(self.text)
        self._redo.clear()
        self.text = new_text

    def write(self, chars):
        self._change(self.text + chars)

    def delete(self, count):
        if count < 1:
            raise ValueError("count must be positive")
        self._change(self.text[: max(len(self.text) - count, 0)])

    def undo(self):
        if not self._undo:
            return False
        self._redo.append(self.text)
        self.text = self._undo.pop()
        return True

    def redo(self):
        if not self._redo:
            return False
        self._undo.append(self.text)
        self.text = self._redo.pop()
        return True
