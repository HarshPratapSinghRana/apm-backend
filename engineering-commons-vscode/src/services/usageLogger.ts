import { ArtifactUsageEvent, createSanitizedUsageEvent } from '../models/usageEvent';
import { IBackendUsageClient } from './backendUsageClient';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export interface IUsageLogger {
    logUsageAsync(event: ArtifactUsageEvent): Promise<void>;
    logActionAsync(
        action: 'LOGIN' | 'LIST' | 'INSTALL' | 'UPDATE' | 'CONTRIBUTE' | 'USE' | 'ACTIVATED' | 'INVOKED' | string,
        artifactName?: string,
        artifactType?: string,
        artifactVersion?: string,
        workspace?: string,
        platform?: string
    ): Promise<void>;
}

export class BackendUsageLogger implements IUsageLogger {
    private usageClient: IBackendUsageClient;
    private authProvider: IAuthenticationStatusProvider;

    constructor(usageClient: IBackendUsageClient, authProvider: IAuthenticationStatusProvider) {
        this.usageClient = usageClient;
        this.authProvider = authProvider;
    }

    public async logActionAsync(
        action: 'LOGIN' | 'LIST' | 'INSTALL' | 'UPDATE' | 'CONTRIBUTE' | 'USE' | 'ACTIVATED' | 'INVOKED' | string,
        artifactName?: string,
        artifactType?: string,
        artifactVersion?: string,
        workspace?: string,
        platform?: string
    ): Promise<void> {
        let userEmail: string | undefined;
        try {
            userEmail = (await this.authProvider.getEmail()) || undefined;
        } catch {}

        const sanitizedEvent = createSanitizedUsageEvent({
            action,
            userEmail,
            userId: userEmail,
            artifactName,
            artifactType,
            artifactVersion,
            workspace,
            platform
        });

        await this.logUsageAsync(sanitizedEvent);
    }

    public async logUsageAsync(event: ArtifactUsageEvent): Promise<void> {
        try {
            // Retrieve token if user is authenticated (to attach to HTTP header)
            const token = await this.authProvider.getToken();
            
            // Fire-and-forget: do not let tracking failures disrupt developer workflow
            await this.usageClient.sendUsageEventAsync(event, token);
        } catch {
            // Silently absorb any network/logging error to keep extension resilient
        }
    }
}
