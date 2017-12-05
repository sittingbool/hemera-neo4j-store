//----------------------------------------------------------------------------------------------------------
import * as Neo4JLib from "neo4j-driver";
const Neo4J = Neo4JLib.v1;
import Store = require("hemera-store");
import {Neo4JNodeModel, INeo4JNodeResponse, Neo4JRelationModel} from "./model";
const integer = require("neo4j-driver/lib/v1/integer");

import * as Joi from 'joi';
import {IDScheme, RelatedNodeScheme} from "./pattern";
import {CypherQueryHelper} from "./query-helper";
//----------------------------------------------------------------------------------------------------------



//----------------------------------------------------------------------------------------------------------
export interface IRelatedEndPointsQuery
//----------------------------------------------------------------------------------------------------------
{
    queryString: string;
    fromIsDefined: boolean;
    toIsDefined: boolean;
    anyDirection: boolean;
    error: string;
}


//------------------------------------------------------------------------------------------------------
export interface ISortRule
//------------------------------------------------------------------------------------------------------
{
    property: string;
    desc: boolean;
}


//------------------------------------------------------------------------------------------------------
export interface IListOptionsRule
//------------------------------------------------------------------------------------------------------
{
    offset: string;
    limit: boolean;
    orderBy: string | string[] | ISortRule | ISortRule[];
}



//----------------------------------------------------------------------------------------------------------
/**
 * hemera store for the Neo4J graph database
 *
 * @class Neo4JStore
 * @extends {Store}
 */
export class Neo4JStore extends Store
//----------------------------------------------------------------------------------------------------------
{
    //------------------------------------------------------------------------------------------------------
    _session: Neo4JLib.v1.Session = null;
    //------------------------------------------------------------------------------------------------------



    //------------------------------------------------------------------------------------------------------
    /**
     * Creates an instance of Store.
     *
     *
     * @memberOf Store
     */
    constructor(driver)
    //------------------------------------------------------------------------------------------------------
    {
        super(driver, {});
    }


    //------------------------------------------------------------------------------------------------------
    protected parseResultObject(object: INeo4JNodeResponse): Neo4JNodeModel
    //------------------------------------------------------------------------------------------------------
    {
        return new Neo4JNodeModel(object);
    }


    //------------------------------------------------------------------------------------------------------
    protected parseResultArray(array: INeo4JNodeResponse[]): Neo4JNodeModel[]
    //------------------------------------------------------------------------------------------------------
    {
        if (!Array.isArray(array)) {
            return array;
        }
        return array.map(item => {
            return this.parseResultObject(item);
        });
    }


    //------------------------------------------------------------------------------------------------------
    protected parseRelationResultObject(object: INeo4JNodeResponse): Neo4JRelationModel
    //------------------------------------------------------------------------------------------------------
    {
        return new Neo4JRelationModel(object);
    }


    //------------------------------------------------------------------------------------------------------
    protected parseRelationResultArray(array: INeo4JNodeResponse[]): Neo4JRelationModel[]
    //------------------------------------------------------------------------------------------------------
    {
        if (!Array.isArray(array)) {
            return array;
        }
        return array.map(item => {
            return this.parseRelationResultObject(item);
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Returns the store session
     *
     * @readonly
     *
     * @memberOf Store
     */
    get session(): Neo4JLib.v1.Session
    //------------------------------------------------------------------------------------------------------
    {
        if ( this._session ) {
            return this._session;
        }

        this._session = this.driver.session();

        return this._session;
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Create a new entity
     *
     *
     * @memberOf Store
     */
    create(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let labels = req.labels || [];
        let data = req.data || {};

        if ( labels.length < 1 ) {
            labels = ['UNKNOWN'];
        }

        let labelString = CypherQueryHelper.generateLabelQueryString(labels);

        let dataString = CypherQueryHelper.generatePropertiesQueryString(data);

        this.session.run(`CREATE (n${labelString} ${dataString}) RETURN n`, data)
            .subscribe({
                onNext: (record) => {
                    _record = record.toObject();
                },
                onCompleted: () => {
                    this.session.close();
                    this._session = null;
                    if (!_record) {
                        return cb(null, _record);
                    }
                    let item = this.parseResultObject(_record.n || {});
                    cb(null, item);
                },
                onError: (error) => {
                    cb(error, null)
                }
            });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Removes multiple entitys
     *
     *
     * @memberOf Store
     */
    remove(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let labels = req.labels || null;
        let data = req.query || null;

        let labelString = '';
        let dataString = '';

        if ( labels && labels.length ) {
            labelString = CypherQueryHelper.generateLabelQueryString(labels);
        }

        if ( data && typeof data === 'object' ) {
            dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);
        }

        let query = `MATCH (n${labelString}${dataString}) DELETE n RETURN COUNT(n) as count`;

        let result;

        if ( data ) {
            result = this.session.run(query, data);
        } else { // wil crash otherwise
            result = this.session.run(query);
        }

        result.subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;

                if ( Neo4J.isInt(count) ) {
                    count = Neo4J.integer.toNumber(count);
                }

                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Remove an entity by id
     *
     *
     * @memberOf Store
     */
    removeById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let startStatement = CypherQueryHelper.startStatementForId(id);

        let query = `${startStatement} DELETE n RETURN COUNT(n) as count`;

        this.session.run(query)
            .subscribe({
                onNext: (record) => {
                    _record = record.toObject();
                },
                onCompleted: () => {
                    this.session.close();
                    this._session = null;
                    let count = _record.count || 0;

                    if ( Neo4J.isInt(count) ) {
                        count = Neo4J.integer.toNumber(count);
                    }

                    cb(null, count || 0);
                },
                onError: (error) => {
                    cb(error, null)
                }
            });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Update an entity
     *
     *
     * @memberOf Store
     */
    update(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let labels = req.labels || null;
        let data = req.data || {};
        let query = req.query || null;

        let labelString = '';
        let queryString = '';
        let dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);

        if ( labels && labels.length ) {
            labelString = CypherQueryHelper.generateLabelQueryString(labels);
        }

        if ( query && typeof query === 'object' ) {
            queryString = ' ' + CypherQueryHelper.generatePropertiesMatchString(query);
        }

        let cypherQuery = `MATCH (n${labelString}${queryString}) SET n += ${dataString} RETURN n`;

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.n ) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseResultArray(_records || []);

                switch (items.length) {
                    case 0:
                        items = null;
                        break;

                    case 1:
                        items = items[0];
                        break;

                    default:
                        break;
                }
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Update an entity by id
     *
     *
     * @memberOf Store
     */
    updateById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let startStatement = CypherQueryHelper.startStatementForId(id);

        let data = req.data || {};
        let dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);

        let cypherQuery = `${startStatement} SET n += ${dataString} RETURN n`;

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item:any = this.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Find an entity
     *
     *
     * @memberOf Store
     */
    find(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let labels = req.labels || null;
        let query = req.query || null;
        let options = req.options || null;

        let labelString = '';
        let queryString = '';
        let optionsString = '';

        if ( options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0 )
        {
            return cb(null, null);
        }

        if ( labels && labels.length ) {
            labelString = CypherQueryHelper.generateLabelQueryString(labels);
        }

        if ( query && typeof query === 'object' ) {
            queryString = ' ' + CypherQueryHelper.generatePropertiesMatchString(query);
        }

        if ( options ) {
            optionsString = CypherQueryHelper.generateOptionsString(options);
        }

        let cypherQuery = `MATCH (n${labelString}${queryString}) RETURN n${optionsString}`;

        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.n ) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Find an entity by id
     *
     *
     * @memberOf Store
     */
    findById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let whereStatement = CypherQueryHelper.whereStatementForId(id);

        let cypherQuery = `MATCH (n) ${whereStatement} RETURN n`;

        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if ( !_record ) {
                    return cb(null, _record);
                }
                let item:any = this.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity
     *
     *
     * @memberOf Store
     */
    replace(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let labels = req.labels || null;
        let data = req.data || {};
        let query = req.query || null;

        let labelString = '';
        let queryString = '';
        let dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);

        if ( labels && labels.length ) {
            labelString = CypherQueryHelper.generateLabelQueryString(labels);
        }

        if ( query && typeof query === 'object' ) {
            queryString = ' ' + CypherQueryHelper.generatePropertiesMatchString(query);
        }

        let cypherQuery = `MATCH (n${labelString}${queryString}) SET n = ${dataString} RETURN n`;

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.n ) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseResultArray(_records || []);

                switch (items.length) {
                    case 0:
                        items = null;
                        break;

                    case 1:
                        items = items[0];
                        break;

                    default:
                        break;
                }
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    replaceById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let startStatement = CypherQueryHelper.startStatementForId(id);

        let data = req.data || {};
        let dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);

        let cypherQuery = `${startStatement} SET n = ${dataString} RETURN n`;

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item:any = this.parseResultObject(_record.n || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Check if an entity exists
     *
     * @memberOf Store
     */
    exists(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let id = req.id || null;
        let query = req.query || null;
        let labels = req.labels || null;

        if ( typeof id === "string" && !isNaN(parseInt(id)) ) {
            id = parseInt(id);
        }

        if ( typeof id === 'number' && id >= 0 ) {
            return this.findById({id: id}, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = typeof res === 'object' && res !== null;
                cb(err, exists);
            });
        }

        if ( (query && typeof query === 'object' && Object.keys(query).length > 0) ||
            (Array.isArray(labels) && labels.length > 0))
        {
            return this.find({labels: labels, query: query, options: {limit: 1}}, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = Array.isArray(res) && res.length > 0;
                cb(err, exists);
            });
        }

        cb({name: 'neo4j-exists-error', message:
            'No ID or query or labels given, can not check for existence'}, false);
    }


    //------------------------------------------------------------------------------------------------------
    protected compileMatchStatementForEndPoint(endPoint, matches: string[],
                                               startStatement: string, queryVar: string = 'n',
                                               useWhereForIds: boolean = false): string
    //------------------------------------------------------------------------------------------------------
    {
        let result = queryVar;

        if (typeof endPoint.id !== 'undefined') {
            if ( useWhereForIds ) {
                matches.push(result);
                return startStatement;
            }
            startStatement += CypherQueryHelper.startStatementForId(endPoint.id, queryVar);
        } else {
            if (Array.isArray(endPoint.labels)) {
                result += CypherQueryHelper.generateLabelQueryString(endPoint.labels);
            }

            if (Object.keys(endPoint).length > 0) {
                result += ' ' + CypherQueryHelper.generatePropertiesMatchString(endPoint.query);
            }

            matches.push(result);
        }

        return startStatement;
    }


    //------------------------------------------------------------------------------------------------------
    protected compileMatchStatementForRelation(type: string, query: any,
                                               endPoints: IRelatedEndPointsQuery): string
    //------------------------------------------------------------------------------------------------------
    {
        let propertyString = '', fromPoint: string, toPoint: string, labelString = '';

        if ( query && typeof query === 'object' ) {
            propertyString = ' ' + CypherQueryHelper.generatePropertiesQueryString(query);
        }

        if ( endPoints.fromIsDefined ) {
            fromPoint = '(n)';
        } else {
            fromPoint = '()';
        }

        if ( endPoints.toIsDefined ) {
            toPoint = '(m)';
        } else {
            toPoint = '()';
        }

        if ( !endPoints.anyDirection && (endPoints.fromIsDefined || endPoints.toIsDefined) ) {
            toPoint = '>' + toPoint;
        }

        if ( type && typeof type === 'string' && type.length > 0 ) {
            labelString = CypherQueryHelper.generateLabelQueryString([type]);
        }

        return `${fromPoint}-[r${labelString}${propertyString}]-${toPoint}`;
    }


    //------------------------------------------------------------------------------------------------------
    protected createRelatedEndPointsQuery(from: any, to: any, anyDirection: boolean,
                                          useWhereForIds: boolean = false): IRelatedEndPointsQuery
    //------------------------------------------------------------------------------------------------------
    {
        let matches: string[] = [], matchString;

        let result:IRelatedEndPointsQuery = {
            queryString: '',
            fromIsDefined: true,
            toIsDefined: true,
            anyDirection: anyDirection,
            error: null
        };

        let startStatement = '', whereStatement = '';

        if ( from && typeof from === 'object' ) {
            startStatement =
                this.compileMatchStatementForEndPoint(from, matches, startStatement, 'n',
                    useWhereForIds);

            if ( useWhereForIds && from.id && !IDScheme.validate(from.id).error ) {
                whereStatement += ' ' +  CypherQueryHelper.whereStatementForId(from.id, 'n');
            }
        } else {
            result.fromIsDefined = false;
        }

        if ( to && typeof to === 'object' ) {
            startStatement =
                this.compileMatchStatementForEndPoint(to, matches, startStatement, 'm',
                    useWhereForIds);

            if ( useWhereForIds && to.id && !IDScheme.validate(to.id).error ) {
                if ( whereStatement.length > 0 ) {
                    whereStatement += ' AND'
                }
                whereStatement += ' ' +  CypherQueryHelper.whereStatementForId(to.id, 'm');
            }
        } else {
            result.toIsDefined = false;
        }

        matchString = CypherQueryHelper.matchStatement(matches);

        if (matchString.length) {
            matchString = ' ' + matchString;
        }

        if ( whereStatement.length > 0 ) {
            whereStatement = ' WHERE' + whereStatement;
        }

        let cypherQuery = `${startStatement}${matchString}${whereStatement}`;

        // TODO: find a better solution for this
        cypherQuery =
            cypherQuery.replace(')START', '), '); // remove redundant start statement

        cypherQuery =
            cypherQuery.replace(/WHERE id\(/g, 'id('); // remove redundant where statement

        result.queryString  = cypherQuery;

        return result;
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    createRelation(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];

        let from = req.from;
        let type = req.type;
        let to = req.to;

        let data = req.data;

        let endPointQuery = this.createRelatedEndPointsQuery(from, to, null);

        let matchQuery = endPointQuery.queryString;

        let relationStatement = this.compileMatchStatementForRelation(type, data, endPointQuery);

        let cypherQuery = `${matchQuery} CREATE ${relationStatement} RETURN r`;

        // TODO: refactor ALL observers to be generated by factory method

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.r ) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    updateRelation(req, cb)
    //------------------------------------------------------------------------------------------------------
    {

        let _records = [];
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let anyDirection = req.anyDirection || false;

        let query = req.query;
        let data = req.data || {};

        let dataString = ' ' + CypherQueryHelper.generatePropertiesMatchString(data);

        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection);

        let matchQuery = endPointQuery.queryString;

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        let relMatchQuery = CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);

        let cypherQuery =
            `${relMatchQuery} SET r += ${dataString} RETURN r`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.r ) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    updateRelationById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let startStatement = CypherQueryHelper.startStatementForRelId(id);

        let data = req.data || {};
        let dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);

        let cypherQuery = `${startStatement} SET r += ${dataString} RETURN r`;

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if ( !_record ) {
                    return cb(null, _record);
                }
                let item:any = this.parseRelationResultObject(_record.r || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    replaceRelation(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let anyDirection = req.anyDirection || false;

        let query = req.query;
        let data = req.data || {};

        let dataString = ' ' + CypherQueryHelper.generatePropertiesMatchString(data);

        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection);

        let matchQuery = endPointQuery.queryString;

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        let relMatchQuery = CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);

        let cypherQuery =
            `${relMatchQuery} SET r = ${dataString} RETURN r`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.r ) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    replaceRelationById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let startStatement = CypherQueryHelper.startStatementForRelId(id);

        let data = req.data || {};
        let dataString = ' ' + CypherQueryHelper.generatePropertiesQueryString(data);

        let cypherQuery = `${startStatement} SET r = ${dataString} RETURN r`;

        this.session.run(cypherQuery, data).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item:any = this.parseRelationResultObject(_record.r || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    removeRelation(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let from = req.from;
        let type = req.type;
        let to = req.to;
        let anyDirection = req.anyDirection || false;

        let query = req.query;

        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection);

        let matchQuery = endPointQuery.queryString;

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        let relMatchQuery = CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);

        let cypherQuery =
            `${relMatchQuery} DELETE r RETURN COUNT(r) as count`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;

                if ( Neo4J.isInt(count) ) {
                    count = Neo4J.integer.toNumber(count);
                }

                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    removeRelationById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let startStatement = CypherQueryHelper.startStatementForRelId(id);

        let cypherQuery = `${startStatement} DELETE r RETURN COUNT(r) as count`;

        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let count = _record.count || 0;

                if ( Neo4J.isInt(count) ) {
                    count = Neo4J.integer.toNumber(count);
                }

                cb(null, count || 0);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    findRelation(req, cb)
    //------------------------------------------------------------------------------------------------------
    {

        let _records = [];
        let from = req.from;
        let type = req.type;
        let options = req.options;
        let to = req.to;
        let anyDirection = req.anyDirection || false;

        let query = req.query;
        let optionsString = '';

        if ( options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0 )
        {
            return cb(null, null);
        }

        let endPointQuery = this.createRelatedEndPointsQuery(from, to, anyDirection, true);

        let matchQuery = endPointQuery.queryString;

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        if ( options ) {
            optionsString = CypherQueryHelper.generateOptionsString(options, 'r');
        }

        let relMatchQuery = CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement);

        let cypherQuery =
            `${relMatchQuery} RETURN DISTINCT r${optionsString}`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.r ) {
                    _records.push(_record.r);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseRelationResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    findRelationStartNodes(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let type = req.type;
        let options = req.options;
        let to = req.to;

        let query = req.query;
        let optionsString = '';

        if ( options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0 )
        {
            return cb(null, null);
        }

        let endPointQuery = this.createRelatedEndPointsQuery({}, to, false);

        let matchQuery = endPointQuery.queryString;

        // remove redundant match for n node to solve performance issues

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        if ( options ) {
            optionsString = CypherQueryHelper.generateOptionsString(options, 'n');
        }

        let relMatchQuery =
            CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement, false);

        relMatchQuery = relMatchQuery.replace('(n), ', '');

        let cypherQuery =
            `${relMatchQuery} RETURN DISTINCT n${optionsString}`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.n ) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    findRelationEndNodes(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let type = req.type;
        let options = req.options;
        let from = req.from;


        let query = req.query;
        let optionsString = '';

        if ( options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0 )
        {
            return cb(null, null);
        }

        let endPointQuery = this.createRelatedEndPointsQuery(from, {}, false);

        let matchQuery = endPointQuery.queryString;

        // remove redundant match for n node to solve performance issues

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        if ( options ) {
            optionsString = CypherQueryHelper.generateOptionsString(options, 'm');
        }

        let relMatchQuery =
            CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement, false);

        relMatchQuery = relMatchQuery.replace('(m), ', '');

        let cypherQuery =
            `${relMatchQuery} RETURN DISTINCT m${optionsString}`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.m ) {
                    _records.push(_record.m);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    findNodesOnRelation(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _records = [];
        let type = req.type;
        let options = req.options;
        let anyNode = req.anyNode || null;

        let query = req.query;
        let optionsString = '';

        if ( options && typeof options === "object" &&
            typeof options.limit === "number" && options.limit === 0 )
        {
            return cb(null, null);
        }

        let endPointQuery = this.createRelatedEndPointsQuery({}, anyNode, true);

        let matchQuery = endPointQuery.queryString;

        // remove redundant match for n node to solve performance issues

        let relationStatement = this.compileMatchStatementForRelation(type, query, endPointQuery);

        if ( options ) {
            optionsString = CypherQueryHelper.generateOptionsString(options, 'n');
        }

        let relMatchQuery =
            CypherQueryHelper.makeStatementForRelationMatch(matchQuery, relationStatement, false);

        relMatchQuery = relMatchQuery.replace('(n), (m), ', '');
        relMatchQuery = relMatchQuery.replace('(n), ', '');

        let cypherQuery =
            `${relMatchQuery} RETURN DISTINCT n${optionsString}`;

        this.session.run(cypherQuery, query).subscribe({
            onNext: (record) => {
                let _record:any = record.toObject();
                if ( _record && _record.n ) {
                    _records.push(_record.n);
                }
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                let items:any = this.parseResultArray(_records || []);
                cb(null, items);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    findRelationById(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let _record = null;
        let id = req.id;

        let whereStatement = CypherQueryHelper.whereStatementForId(id, 'r');

        let cypherQuery = `MATCH ()-[r]-() ${whereStatement} RETURN DISTINCT r`;

        this.session.run(cypherQuery).subscribe({
            onNext: (record) => {
                _record = record.toObject();
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;
                if (!_record) {
                    return cb(null, _record);
                }
                let item:any = this.parseRelationResultObject(_record.r || {});
                cb(null, item);
            },
            onError: (error) => {
                cb(error, null);
            }
        });
    }


    //------------------------------------------------------------------------------------------------------
    /**
     * Check if an entity exists
     *
     * @memberOf Store
     */
    relationExists(req, cb)
    //------------------------------------------------------------------------------------------------------
    {
        let id = req.id || null;
        let from = req.from;
        let to = req.to;
        let type = req.type || null, validationFrom, validationTo, query;

        if ( typeof id === "string" && !isNaN(parseInt(id)) ) {
            id = parseInt(id);
        }

        if ( typeof id === 'number' && id >= 0 ) {
            return this.findRelationById({id: id}, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = typeof res === 'object' && res !== null;
                cb(err, exists);
            });
        }

        validationFrom = Joi.validate(from, RelatedNodeScheme);
        validationTo = Joi.validate(to, RelatedNodeScheme);

        if ( (type && typeof type === 'string' && type.length > 0) ||
            !validationFrom.error || !validationTo.error )
        {
            query = {type: type, from: from, to: to, anyDirection: req.anyDirection, options: {limit: 1}};
            return this.findRelation(query, (err, res) => {
                let exists;
                if (err) {
                    return cb(err, null);
                }
                exists = Array.isArray(res) && res.length > 0;
                cb(err, exists);
            });
        }

        cb({name: 'neo4j-exists-error', message:
            'No ID or query or type given, can not check for existence'}, false);
    }



    //------------------------------------------------------------------------------------------------------
    /**
     * Replace an entity by id
     *
     *
     * @memberOf Store
     */
    executeCypherQuery(req, cb)
    //------------------------------------------------------------------------------------------------------
    {

        // TODO: offer to add an array of variables that should be parsed as relation or node
        // {parseVariables: {asNode: ['n', 'm'], asRelation: ['r']}}
        let parameters = req.parameters || null;

        let cypherQuery = req.query;

        let records: any[] = [];

        let observable;

        if ( parameters ) {
            observable = this.session.run(cypherQuery, parameters);
        } else {
            observable = this.session.run(cypherQuery);
        }

        observable.subscribe({
            onNext: (record) => {
                records.push(record.toObject());
            },
            onCompleted: () => {
                this.session.close();
                this._session = null;

                cb(null, records);
            },
            onError: (error) => {
                cb(error, null)
            }
        });
    }
}
