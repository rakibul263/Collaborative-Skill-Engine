import * as Y from "yjs";

/**
 * createMonacoYjsBinding
 *
 * Ultra-fast, zero-dependency CRDT two-way synchronization between Yjs and Monaco Editor.
 * Works seamlessly with @monaco-editor/react without requiring full monaco-editor bundle.
 *
 * @param {Y.Text} ytext - The Yjs collaborative text object
 * @param {object} editor - The Monaco standalone editor instance
 * @param {object} monaco - The Monaco library instance passed by onMount
 * @returns {object} { destroy() }
 */
export function createMonacoYjsBinding(ytext, editor, monaco) {
  if (!ytext || !editor || !monaco) return { destroy: () => {} };

  const model = editor.getModel();
  const doc = ytext.doc;
  let isApplyingRemote = false;

  // 1. Initial Sync: Set model content from Yjs text if Yjs has text
  const initialYtext = ytext.toString();
  if (initialYtext.length > 0 && model.getValue() !== initialYtext) {
    isApplyingRemote = true;
    model.setValue(initialYtext);
    isApplyingRemote = false;
  } else if (initialYtext.length === 0 && model.getValue().length > 0) {
    doc.transact(() => {
      ytext.insert(0, model.getValue());
    }, "local-init");
  }

  // 2. Yjs -> Monaco: Listen for remote CRDT operations
  const ytextObserver = (event, transaction) => {
    // If change was made locally by this client, ignore
    if (transaction.origin === "monaco-local" || isApplyingRemote) return;

    isApplyingRemote = true;
    try {
      let index = 0;
      event.delta.forEach((op) => {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.insert !== undefined) {
          const pos = model.getPositionAt(index);
          const range = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
          const insertText = String(op.insert);
          model.applyEdits([{ range, text: insertText, forceMoveMarkers: true }]);
          index += insertText.length;
        } else if (op.delete !== undefined) {
          const pos = model.getPositionAt(index);
          const endPos = model.getPositionAt(index + op.delete);
          const range = new monaco.Range(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column);
          model.applyEdits([{ range, text: "", forceMoveMarkers: true }]);
        }
      });
    } catch (err) {
      console.warn("[MonacoYjs] delta apply error, falling back to full value:", err);
      const fullText = ytext.toString();
      if (model.getValue() !== fullText) {
        model.setValue(fullText);
      }
    } finally {
      isApplyingRemote = false;
    }
  };

  ytext.observe(ytextObserver);

  // 3. Monaco -> Yjs: Listen for local user keyboard / paste edits
  const monacoListener = model.onDidChangeContent((event) => {
    if (isApplyingRemote) return;

    doc.transact(() => {
      // Sort changes in reverse order (right-to-left) so indices stay stable
      const changes = [...event.changes].sort((a, b) => b.rangeOffset - a.rangeOffset);
      changes.forEach((change) => {
        ytext.delete(change.rangeOffset, change.rangeLength);
        if (change.text.length > 0) {
          ytext.insert(change.rangeOffset, change.text);
        }
      });
    }, "monaco-local");
  });

  return {
    destroy: () => {
      ytext.unobserve(ytextObserver);
      monacoListener.dispose();
    },
  };
}

export default createMonacoYjsBinding;

