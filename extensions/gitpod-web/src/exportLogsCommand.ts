import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IFile, zip } from './util/zip';

async function fileExists(path: string): Promise<boolean> {
	try {
		await fs.promises.access(path);
		return true;
	} catch {
		return false;
	}
}

async function walkDirRecursive(dir: string) {
	const _walkDirRecursive = async (dir: string, result: string[]) => {
		const items = await fs.promises.readdir(dir);
		for (const item of items) {
			const filePath = path.join(dir, item);
			const isDir = (await fs.promises.lstat(filePath)).isDirectory();
			if (isDir) {
				await _walkDirRecursive(filePath, result);
			} else {
				result.push(filePath);
			}
		}
	};

	const result: string[] = [];
	await _walkDirRecursive(dir, result);
	return result;
}

async function collectLogs(context: vscode.ExtensionContext): Promise<IFile[]> {
	const remoteLogsDir = path.dirname(path.dirname(context.logUri.fsPath));
	const files = await walkDirRecursive(remoteLogsDir);
	console.log(`====> logs uri: ${context.logUri.toString()}`);
	console.log(`====> session id: ${vscode.env.sessionId}`);
	console.log(`====> files: ${files}`);

	const sessionDate = path.basename(remoteLogsDir);
	const result = files.map(f => ({ path: `logs_${sessionDate}/${path.relative(remoteLogsDir, f)}`, localPath: f }));

	// git credentials logs
	const credentialHelperPath = '/tmp/gitpod-git-credential-helper.log';
	if (await fileExists(credentialHelperPath)) {
		result.push({ path: `logs_${sessionDate}/${path.basename(credentialHelperPath)}`, localPath: credentialHelperPath });
	}

	return result;
}

function getDefaultPath() {
	const logsFolder = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0)
		? vscode.workspace.workspaceFolders[0].uri.path
		: os.homedir();
	return path.join(logsFolder, 'logs.zip');
}

export function registerExportLogsCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('gitpod.exportLogs', async () => {
		await vscode.window.withProgress({
			title: 'Exporting logs ...',
			location: vscode.ProgressLocation.Notification,
		}, async () => {
			const zipFileUri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(getDefaultPath()),
				filters: { 'Zip': ['zip'] },
			});

			if (!zipFileUri || !zipFileUri.fsPath) {
				throw new Error('Invalid save location');
			}

			let zipFilePath = zipFileUri.fsPath;
			if (!zipFilePath.endsWith('.zip')) {
				zipFilePath = zipFilePath.concat('.zip');
			}

			const files = await collectLogs(context);
			await zip(zipFilePath, files);

		});
	}));
}
