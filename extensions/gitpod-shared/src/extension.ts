/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Gitpod. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { createGitpodExtensionContext, GitpodExtensionContext, registerDefaultLayout, registerNotifications, registerWorkspaceCommands, registerWorkspaceSharing, registerWorkspaceTimeout } from './features';

export { GitpodExtensionContext, registerTasks, SupervisorConnection, registerIpcHookCli } from './features';
export * from './gitpod-plugin-model';

export async function setupGitpodContext(context: vscode.ExtensionContext): Promise<GitpodExtensionContext | undefined> {
	if (typeof vscode.env.remoteName === 'undefined' || context.extension.extensionKind !== vscode.ExtensionKind.Workspace) {
		return undefined;
	}

	const gitpodContext = await createGitpodExtensionContext(context);
	vscode.commands.executeCommand('setContext', 'gitpod.inWorkspace', !!gitpodContext);

	if (!gitpodContext) {
		return undefined;
	}

	vscode.commands.executeCommand('setContext', 'gitpod.ideAlias', gitpodContext.info.getIdeAlias());
	vscode.commands.executeCommand('setContext', 'gitpod.UIKind', vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop');

	registerUsageAnalytics(gitpodContext);
	registerWorkspaceCommands(gitpodContext);
	registerWorkspaceSharing(gitpodContext);
	registerWorkspaceTimeout(gitpodContext);
	registerNotifications(gitpodContext);
	registerDefaultLayout(gitpodContext);
	return gitpodContext;
}

function registerUsageAnalytics(context: GitpodExtensionContext): void {
	context.fireAnalyticsEvent({ eventName: 'vscode_session', properties: {} });
}

