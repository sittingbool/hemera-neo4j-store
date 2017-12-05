import { INeo4JNodeResponse, Neo4JNodeModel, Neo4JRelationModel } from "./model";
export declare class Neo4jResultParser {
    static parseResultObject(object: INeo4JNodeResponse): Neo4JNodeModel;
    static parseResultArray(array: INeo4JNodeResponse[]): Neo4JNodeModel[];
    static parseRelationResultObject(object: INeo4JNodeResponse): Neo4JRelationModel;
    static parseRelationResultArray(array: INeo4JNodeResponse[]): Neo4JRelationModel[];
}
