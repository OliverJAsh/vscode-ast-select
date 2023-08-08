import * as vscode from 'vscode';
import { fetchCandidateNodesForWholeExpression } from './candidateNode';
import { showNodePicker } from './picker';

const languageIds = [
	'typescript',
	'typescriptreact',
	'javascript',
	'javascriptreact',
];

const withProgress = <T>(callback: () => Promise<T>) =>
	vscode.window.withProgress<T>(
		{
			location: vscode.ProgressLocation.Window,
			title: 'Parsing AST…',
		},
		callback,
	);

export const activate = (context: vscode.ExtensionContext) => {
	vscode.commands.registerCommand('ast-select.expression.pick', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor === undefined) return;

		const { document } = editor;
		if (!languageIds.includes(document.languageId)) return;

		const candidates = await withProgress(() =>
			fetchCandidateNodesForWholeExpression(editor.document, editor.selection),
		);

		const picker = showNodePicker({ editor, candidates });
		context.subscriptions.push(picker);
	});
};
