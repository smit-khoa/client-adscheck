
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/App' | 'REMOTE_ALIAS_IDENTIFIER/routes';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/routes' ? typeof import('REMOTE_ALIAS_IDENTIFIER/routes') :T extends 'REMOTE_ALIAS_IDENTIFIER/App' ? typeof import('REMOTE_ALIAS_IDENTIFIER/App') :any;