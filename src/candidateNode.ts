import * as vscode from 'vscode';
import * as ts from 'typescript';

export interface CandidateNode {
	selection: vscode.Selection;
	getText(): string;
}

// NOTE: ParenthesizedExpression itself is meaningless because it can contain only one Node.
// Respect it only when it is first (shortest) node in candidate.
// Note that wrapping with meaningless parentheses is popular in React development.
//   return (
//     <div>...</div>
//   )
const nodeFilterForExpression = (node: ts.Node, index: number) =>
	(index === 0 || !ts.isParenthesizedExpression(node)) &&
	ts.isExpressionNode(node);

export const fetchCandidateNodesForWholeExpression = async (
	document: vscode.TextDocument,
	range: vscode.Range,
): Promise<CandidateNode[]> => {
	const sourceFile = getSourceFile(document);
	const nodePath = traverseForShortestNodePathContainsRange(sourceFile, range);
	const expressionNodes = [...nodePath]
		.reverse()
		.filter(nodeFilterForExpression);
	const candidateNodes = await Promise.all(
		expressionNodes.map((node) => fetchCandidateNode(node, sourceFile)),
	);
	return candidateNodes.filter((c): c is CandidateNode => c !== null);
};

const fetchCandidateNode = async (
	node: ts.Node,
	sourceFile: ts.SourceFile,
): Promise<CandidateNode | null> => {
	const selection = selectionFromNode(node, sourceFile);
	const getText = () => node.getText(sourceFile);
	return { selection, getText };
};

const traverseForShortestNodePathContainsRange = (
	sourceFile: ts.SourceFile,
	range: vscode.Range,
) => {
	const nodePath: ts.Node[] = [];
	const callback = (node: ts.Node) => {
		if (!doesNodeContainRange(node, range, sourceFile)) return;
		nodePath.push(node);
		ts.forEachChild(node, callback);
	};
	ts.forEachChild(sourceFile, callback);
	return nodePath;
};

const getSourceFile = (document: vscode.TextDocument) =>
	ts.createSourceFile(
		document.fileName,
		document.getText(),
		ts.ScriptTarget.Latest,
		/* setParentNodes */ true,
	);

const doesNodeContainRange = (
	node: ts.Node,
	range: vscode.Range,
	sourceFile: ts.SourceFile,
) => {
	const startPosition = getSourceFilePosition(range.start, sourceFile);
	const endPosition = getSourceFilePosition(range.end, sourceFile);
	return (
		node.getStart(sourceFile) <= startPosition && endPosition <= node.getEnd()
	);
};

const selectionFromNode = (node: ts.Node, sourceFile: ts.SourceFile) => {
	const start = sourceFile.getLineAndCharacterOfPosition(
		node.getStart(sourceFile),
	);
	const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
	return new vscode.Selection(
		new vscode.Position(start.line, start.character),
		new vscode.Position(end.line, end.character),
	);
};

const getSourceFilePosition = (
	position: vscode.Position,
	sourceFile: ts.SourceFile,
) =>
	sourceFile.getPositionOfLineAndCharacter(position.line, position.character);
