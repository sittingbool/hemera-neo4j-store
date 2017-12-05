import { IListOptionsRule, ISortRule } from "./store";
export declare class CypherQueryHelper {
    static startStatementForId(id: any, queryVar?: string): string;
    static startStatementForRelId(id: any, queryVar?: string): string;
    static whereStatementForId(id: any, queryVar?: string): string;
    static matchStatement(matches: string[], queryVars?: string[]): string;
    static generateLabelQueryString(labels: string[]): string;
    static generatePropertiesQueryString(data: Object): string;
    static generatePropertiesMatchString(data: Object): string;
    static generateSortString(sortData: string | string[] | ISortRule | ISortRule[], queryVar?: string, addSortCmd?: boolean): string;
    static generateOptionsString(options: IListOptionsRule, queryVar?: string): string;
    static makeStatementForRelationMatch(matchQuery: string, relationStatement: string, optionalMatch?: boolean): string;
}
