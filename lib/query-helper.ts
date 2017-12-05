//----------------------------------------------------------------------------------------------------------
import * as Neo4JLib from "neo4j-driver";
import {IListOptionsRule, ISortRule} from "./store";
const Neo4J = Neo4JLib.v1;
const integer = require("neo4j-driver/lib/v1/integer");
//----------------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------------
export class CypherQueryHelper
//----------------------------------------------------------------------------------------------------------
{
    //------------------------------------------------------------------------------------------------------
    static startStatementForId(id: any, queryVar: string = 'n'): string
    //------------------------------------------------------------------------------------------------------
    {
        if ( typeof id === 'object' ) {
            id = integer.int(id.low, id.high);
        }

        if ( Neo4J.isInt(id) ) {
            id = Neo4J.integer.toString(id);
        }

        return `START ${queryVar}=node(${id})`;
    }


    //------------------------------------------------------------------------------------------------------
    static startStatementForRelId(id: any, queryVar: string = 'r'): string
    //------------------------------------------------------------------------------------------------------
    {
        if ( typeof id === 'object' ) {
            id = integer.int(id.low, id.high);
        }

        if ( Neo4J.isInt(id) ) {
            id = Neo4J.integer.toString(id);
        }

        return `START ${queryVar}=rel(${id})`;
    }


    //------------------------------------------------------------------------------------------------------
    static whereStatementForId(id: any, queryVar: string = 'n'): string
    //------------------------------------------------------------------------------------------------------
    {
        if ( typeof id === 'object' ) {
            id = integer.int(id.low, id.high);
        }

        if ( Neo4J.isInt(id) ) {
            id = Neo4J.integer.toString(id);
        }

        return `WHERE id(${queryVar}) = ${id}`;
    }


    //------------------------------------------------------------------------------------------------------
    static matchStatement(matches: string[], queryVars?: string[]): string
    //------------------------------------------------------------------------------------------------------
    {
        let matchString = '', i, current, queryVar = '';

        if (matches.length < 1) {
            return '';
        }

        for( i = 0; i < matches.length; i++ ) {
            current = matches[i];
            if (queryVars && Array.isArray(queryVars)) {
                queryVar = queryVars[i] || 'n';
            }

            matchString += '(' + queryVar + current + '), ';
        }

        let index = matchString.lastIndexOf(', ');

        if ( index < 0 ) {
            index = 0;
        }

        matchString = matchString.substring(0 , index);

        return `MATCH ${matchString}`;
    }


    //------------------------------------------------------------------------------------------------------
    static generateLabelQueryString(labels: string[]): string
    //------------------------------------------------------------------------------------------------------
    {
        return ':' + labels.join(':');
    }


    //------------------------------------------------------------------------------------------------------
    static generatePropertiesQueryString(data: Object): string
    //------------------------------------------------------------------------------------------------------
    {
        let dataString = '{ ', keys: string[];

        keys = Object.keys(data);

        if ( keys.length < 1 ) {
            return '';
        }

        keys.forEach(key => {
            dataString += key + ' : {' + key + '}, ';
        });

        let index = dataString.lastIndexOf(', ');

        if ( index < 0 ) {
            index = 0;
        }

        dataString = dataString.substring(0 , index) + ' }';

        return dataString;
    }


    //------------------------------------------------------------------------------------------------------
    static generatePropertiesMatchString(data: Object): string
    //------------------------------------------------------------------------------------------------------
    {
        let dataString = '{ ', keys: string[];

        keys = Object.keys(data);

        if ( keys.length < 1 ) {
            return '{}';
        }

        keys.forEach(key => {
            dataString += key + ': ' + JSON.stringify(data[key]) + ', ';
        });

        let index = dataString.lastIndexOf(', ');

        if ( index < 0 ) {
            index = 0;
        }

        dataString = dataString.substring(0 , index) + ' }';

        return dataString;
    }


    //------------------------------------------------------------------------------------------------------
    static generateSortString(sortData: string | string[] | ISortRule | ISortRule[],
                              queryVar: string = 'n', addSortCmd: boolean = true): string
    //------------------------------------------------------------------------------------------------------
    {
        let result = '', i, sortRule: ISortRule, index;

        if ( !sortData ) {
            return result;
        }

        if ( addSortCmd ) {
            result += ' ORDER BY'
        }

        switch (typeof sortData) {
            case 'string':
                result += ' ' + queryVar + '.' + sortData;
                break;

            case 'object':
                if ( Array.isArray(sortData) ) {
                    for( i = 0; i < sortData.length; i++ ) {
                        result += this.generateSortString(sortData[i], queryVar, false) + ', ';
                    }

                    index = result.lastIndexOf(', ');

                    if ( index < 0 ) {
                        index = 0;
                    }

                    result = result.substring(0 , index);

                    return result;
                }

                sortRule = (<ISortRule>sortData);
                result += ' ' + queryVar + '.' + sortRule.property;

                if ( sortRule.desc === true ) {
                    result += ' DESC';
                }
                break;

            default:
                return '';
        }

        return result;
    }


    //------------------------------------------------------------------------------------------------------
    static generateOptionsString(options: IListOptionsRule, queryVar = 'n'): string
    //------------------------------------------------------------------------------------------------------
    {
        let result = '';

        if ( !options || typeof options !== "object" || Object.keys(options).length < 1 ) {
            return result;
        }

        if ( options.orderBy ) {
            result += this.generateSortString(options.orderBy, queryVar);
        }

        if ( options.offset && typeof options.offset === "number" && options.offset > 0 ) {
            result += ' SKIP ' + options.offset;
        }

        if ( options.limit && typeof options.limit === "number" && options.limit > -1 ) {
            result += ' LIMIT ' + options.limit;
        }

        return result;
    }


    //------------------------------------------------------------------------------------------------------
    static makeStatementForRelationMatch(matchQuery: string, relationStatement: string,
                                            optionalMatch:boolean = true): string
    //------------------------------------------------------------------------------------------------------
    {
        let whereQuery: string, whereQueryIndex;

        if (matchQuery && typeof matchQuery === "string" && matchQuery.length) {
            if (optionalMatch) {
                return `${matchQuery} OPTIONAL MATCH ${relationStatement}`;
            }

            // where must be after match
            whereQuery = '';
            whereQueryIndex = matchQuery.indexOf(' WHERE');

            if (whereQueryIndex > -1) {
                whereQuery = matchQuery.substr(whereQueryIndex);
                matchQuery = matchQuery.substring(0, whereQueryIndex);
            }

            return `${matchQuery}, ${relationStatement}${whereQuery}`;
        }

        //  if no nodes are matched the relationship match becomes mandatory
        return `MATCH ${relationStatement}`;
    }
}