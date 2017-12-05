import * as Neo4JLib from "neo4j-driver";
import Store = require("hemera-store");
export interface IRelatedEndPointsQuery {
    queryString: string;
    fromIsDefined: boolean;
    toIsDefined: boolean;
    anyDirection: boolean;
    error: string;
}
export interface ISortRule {
    property: string;
    desc: boolean;
}
export interface IListOptionsRule {
    offset: string;
    limit: boolean;
    orderBy: string | string[] | ISortRule | ISortRule[];
}
export declare class Neo4JStore extends Store {
    _session: Neo4JLib.v1.Session;
    constructor(driver: any);
    readonly session: Neo4JLib.v1.Session;
    create(req: any, cb: any): void;
    remove(req: any, cb: any): void;
    removeById(req: any, cb: any): void;
    update(req: any, cb: any): void;
    updateById(req: any, cb: any): void;
    find(req: any, cb: any): any;
    findById(req: any, cb: any): void;
    replace(req: any, cb: any): void;
    replaceById(req: any, cb: any): void;
    exists(req: any, cb: any): any;
    protected compileMatchStatementForEndPoint(endPoint: any, matches: string[], startStatement: string, queryVar?: string, useWhereForIds?: boolean): string;
    protected compileMatchStatementForRelation(type: string, query: any, endPoints: IRelatedEndPointsQuery): string;
    protected createRelatedEndPointsQuery(from: any, to: any, anyDirection: boolean, useWhereForIds?: boolean): IRelatedEndPointsQuery;
    createRelation(req: any, cb: any): void;
    updateRelation(req: any, cb: any): void;
    updateRelationById(req: any, cb: any): void;
    replaceRelation(req: any, cb: any): void;
    replaceRelationById(req: any, cb: any): void;
    removeRelation(req: any, cb: any): void;
    removeRelationById(req: any, cb: any): void;
    findRelation(req: any, cb: any): any;
    findRelationStartNodes(req: any, cb: any): any;
    findRelationEndNodes(req: any, cb: any): any;
    findNodesOnRelation(req: any, cb: any): any;
    findRelationById(req: any, cb: any): void;
    relationExists(req: any, cb: any): any;
    executeCypherQuery(req: any, cb: any): void;
}
