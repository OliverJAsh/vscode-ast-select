import * as vscode from 'vscode';
import { CandidateNode } from './candidateNode';

export interface CandidatePickItem
	extends vscode.QuickPickItem,
		CandidateNode {}

export const showNodePicker = ({
	editor,
	candidates,
}: {
	editor: vscode.TextEditor;
	candidates: CandidateNode[];
}): vscode.Disposable => {
	let accepted = false;
	const initialSelection = editor.selection;

	const maybeSoftUndo = async () => {
		if (!editor.selection.isEqual(initialSelection)) {
			await vscode.commands.executeCommand('cursorUndo');
		}
	};

	const quickPick = vscode.window.createQuickPick<CandidatePickItem>();
	quickPick.placeholder = 'Expressions';
	quickPick.items = candidates.map<CandidatePickItem>((candidate) => ({
		...candidate,
		label: candidate.getText().replace(/\s+/g, ' '),
	}));
	quickPick.onDidChangeActive(async (item) => {
		await maybeSoftUndo();
		editor.selection =
			item[0] !== undefined ? item[0].selection : initialSelection;
	});
	quickPick.onDidAccept(() => {
		accepted = true;
		quickPick.dispose();
	});
	quickPick.onDidHide(async () => {
		if (accepted) return;
		await maybeSoftUndo();
		quickPick.dispose();
	});
	quickPick.show();

	return quickPick;
};
