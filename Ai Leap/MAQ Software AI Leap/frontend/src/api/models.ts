export type AnswerResponse = {
    TimeStamp: string;
    text: string;
    URL: string | undefined | null;
    URLType: string | undefined | null;
};

export type ChatResponse = {
    answer: AnswerResponse;
};

export type ChatTurn = {
    previous_question: string;
    previous_answer: string;
};

export type ChatRequest = {
    question: string;
    scopeName: string;
    history: ChatTurn[];
    BotVersion: string;
};

export type ChatDialog = {
    Offset: number;
    Text: string;
};

export type BaseResponse = {
    message: string;
    reason: string;
    status: number | string;
};

export type AdminListResponse = BaseResponse & {
    data: string[];
};

export type OrganisationUsersResponse = BaseResponse & {
    email: string;
};

export type BlobConnStringConfig = {
    ConnectionString: string;
};

export type BlobMSIConfig = {
    StorageAccountName: string;
    ContainerName: string;
};

export type SqlMSIConfig = {
    ServerName: string;
    DatabaseName: string;
};

export type SqlLoginConfig = SqlMSIConfig & {
    Password: string;
    SqlQuery: string;
};

export type DataSourceConfiguration = {
    Priority: number;
    DataSourceName: string;
    Configuration: BlobConnStringConfig | BlobMSIConfig | SqlMSIConfig | SqlLoginConfig;
    Category: string;
    FolderPath: string;
    ContainerName: string;
};
export type SQLDatabaseConfiguration = {
    ServerName: string,
    DatabaseName: string,
    UID: string,
    PWD: string,
    Category: string;
};

export type ScopeConfiguration = {
    Category: string;
    ScopeName: string;
    UserList: string[];
    BusinessRules: (DataSourceConfiguration | SQLDatabaseConfiguration)[];
    PreDefinedQuestion?: string[];
};

export type ScopeDataResponse = BaseResponse & {
    data: ScopeConfiguration[];
};

export enum Mode {
    CREATE = "create",
    EDIT = "edit",
    VIEW = "view"
}