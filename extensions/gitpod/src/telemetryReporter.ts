import { AppenderData, BaseTelemetryAppender, BaseTelemetryClient, BaseTelemetryReporter } from './common/telemetry';
import SegmentAnalytics from 'analytics-node';
import * as os from 'os';
import * as vscode from 'vscode';

export default class TelemetryReporter extends BaseTelemetryReporter {

	private _userId: string | undefined;

	constructor(extensionId: string, extensionVersion: string, key: string) {
		let resolveTelemetryClient: (value: Promise<BaseTelemetryClient>) => void;
		const telemetryClientPromise = new Promise<BaseTelemetryClient>((resolve, _reject) => resolveTelemetryClient = resolve);

		const appender = new BaseTelemetryAppender(key, () => telemetryClientPromise);
		super(extensionId, extensionVersion, appender, {
			release: os.release(),
			platform: os.platform(),
			architecture: os.arch(),
		});

		resolveTelemetryClient!(this.analyticsClientFactory(key));
	}

	setUserId(id: string | undefined) {
		this._userId = id;
	}

	async analyticsClientFactory(key: string): Promise<BaseTelemetryClient> {
		let segmentAnalyticsClient = new SegmentAnalytics(key);

		// Sets the analytics client into a standardized form
		const telemetryClient: BaseTelemetryClient = {
			logEvent: (eventName: string, data?: AppenderData) => {
				try {
					segmentAnalyticsClient.track({
						userId: this._userId,
						anonymousId: vscode.env.machineId,
						event: eventName,
						properties: data?.properties
					});
				} catch (e: any) {
					throw new Error('Failed to log event to app analytics!\n' + e.message);
				}
			},
			logException: (_exception: Error, _data?: AppenderData) => {
				throw new Error('Failed to log exception to app analytics!\n');
			},
			flush: async () => {
				try {
					// Types are oudated, flush does return a promise
					await segmentAnalyticsClient.flush();
				} catch (e: any) {
					throw new Error('Failed to flush app analytics!\n' + e.message);
				}
			}
		};
		return telemetryClient;
	}
}
