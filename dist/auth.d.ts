export declare function loadTokensFromFile(): boolean;
export declare function getAuthorizationUrl(): string;
export declare function exchangeCodeForTokens(code: string): Promise<void>;
export declare function getOAuthAccessToken(): Promise<string>;
export declare function getAsorAccessToken(): Promise<string>;
export declare function isOAuthAuthenticated(): boolean;
export declare function injectRefreshToken(refreshToken: string): void;
//# sourceMappingURL=auth.d.ts.map