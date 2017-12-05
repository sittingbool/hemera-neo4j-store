"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Neo4JLib = require("neo4j-driver");
const Neo4J = Neo4JLib.v1;
const integer = require("neo4j-driver/lib/v1/integer");
class CypherQueryHelper {
    static startStatementForId(id, queryVar = 'n') {
        if (typeof id === 'object') {
            id = integer.int(id.low, id.high);
        }
        if (Neo4J.isInt(id)) {
            id = Neo4J.integer.toString(id);
        }
        return `START ${queryVar}=node(${id})`;
    }
    static startStatementForRelId(id, queryVar = 'r') {
        if (typeof id === 'object') {
            id = integer.int(id.low, id.high);
        }
        if (Neo4J.isInt(id)) {
            id = Neo4J.integer.toString(id);
        }
        return `START ${queryVar}=rel(${id})`;
    }
    static whereStatementForId(id, queryVar = 'n') {
        if (typeof id === 'object') {
            id = integer.int(id.low, id.high);
        }
        if (Neo4J.isInt(id)) {
            id = Neo4J.integer.toString(id);
        }
        return `WHERE id(${queryVar}) = ${id}`;
    }
    static matchStatement(matches, queryVars) {
        let matchString = '', i, current, queryVar = '';
        if (matches.length < 1) {
            return '';
        }
        for (i = 0; i < matches.length; i++) {
            current = matches[i];
            if (queryVars && Array.isArray(queryVars)) {
                queryVar = queryVars[i] || 'n';
            }
            matchString += '(' + queryVar + current + '), ';
        }
        let index = matchString.lastIndexOf(', ');
        if (index < 0) {
            index = 0;
        }
        matchString = matchString.substring(0, index);
        return `MATCH ${matchString}`;
    }
    static generateLabelQueryString(labels) {
        return ':' + labels.join(':');
    }
    static generatePropertiesQueryString(data) {
        let dataString = '{ ', keys;
        keys = Object.keys(data);
        if (keys.length < 1) {
            return '';
        }
        keys.forEach(key => {
            dataString += key + ' : {' + key + '}, ';
        });
        let index = dataString.lastIndexOf(', ');
        if (index < 0) {
            index = 0;
        }
        dataString = dataString.substring(0, index) + ' }';
        return dataString;
    }
    static generatePropertiesMatchString(data) {
        let dataString = '{ ', keys;
        keys = Object.keys(data);
        if (keys.length < 1) {
            return '{}';
        }
        keys.forEach(key => {
            dataString += key + ': ' + JSON.stringify(data[key]) + ', ';
        });
        let index = dataString.lastIndexOf(', ');
        if (index < 0) {
            index = 0;
        }
        dataString = dataString.substring(0, index) + ' }';
        return dataString;
    }
    static generateSortString(sortData, queryVar = 'n', addSortCmd = true) {
        let result = '', i, sortRule, index;
        if (!sortData) {
            return result;
        }
        if (addSortCmd) {
            result += ' ORDER BY';
        }
        switch (typeof sortData) {
            case 'string':
                result += ' ' + queryVar + '.' + sortData;
                break;
            case 'object':
                if (Array.isArray(sortData)) {
                    for (i = 0; i < sortData.length; i++) {
                        result += this.generateSortString(sortData[i], queryVar, false) + ', ';
                    }
                    index = result.lastIndexOf(', ');
                    if (index < 0) {
                        index = 0;
                    }
                    result = result.substring(0, index);
                    return result;
                }
                sortRule = sortData;
                result += ' ' + queryVar + '.' + sortRule.property;
                if (sortRule.desc === true) {
                    result += ' DESC';
                }
                break;
            default:
                return '';
        }
        return result;
    }
    static generateOptionsString(options, queryVar = 'n') {
        let result = '';
        if (!options || typeof options !== "object" || Object.keys(options).length < 1) {
            return result;
        }
        if (options.orderBy) {
            result += this.generateSortString(options.orderBy, queryVar);
        }
        if (options.offset && typeof options.offset === "number" && options.offset > 0) {
            result += ' SKIP ' + options.offset;
        }
        if (options.limit && typeof options.limit === "number" && options.limit > -1) {
            result += ' LIMIT ' + options.limit;
        }
        return result;
    }
    static makeStatementForRelationMatch(matchQuery, relationStatement, optionalMatch = true) {
        let whereQuery, whereQueryIndex;
        if (matchQuery && typeof matchQuery === "string" && matchQuery.length) {
            if (optionalMatch) {
                return `${matchQuery} OPTIONAL MATCH ${relationStatement}`;
            }
            whereQuery = '';
            whereQueryIndex = matchQuery.indexOf(' WHERE');
            if (whereQueryIndex > -1) {
                whereQuery = matchQuery.substr(whereQueryIndex);
                matchQuery = matchQuery.substring(0, whereQueryIndex);
            }
            return `${matchQuery}, ${relationStatement}${whereQuery}`;
        }
        return `MATCH ${relationStatement}`;
    }
}
exports.CypherQueryHelper = CypherQueryHelper;
//# sourceMappingURL=query-helper.js.map