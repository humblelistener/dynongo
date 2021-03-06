import * as path from 'path';
import test from 'ava';
import * as sinon from 'sinon';
import * as loadJsonFile from 'load-json-file';
import { CreateTable } from '../../lib/methods/create-table';
import { Schema } from '../../lib/types/schema';
import db = require('../../');

db.connect({prefix: 'foo'});

const schema: Schema = loadJsonFile.sync(path.join(__dirname, '../fixtures/schema.json'));

const Table = db.table('Bar');

const sandbox = sinon.sandbox.create();
let createTableStub;
let describeTableStub;

test.before(() => {
	createTableStub = sandbox.stub(db.raw, 'createTable');
	createTableStub.yields(undefined, undefined);

	describeTableStub = sinon.stub(db.raw, 'describeTable');
	describeTableStub.onFirstCall().yields(undefined, {Table: {TableStatus: 'CREATING'}});
	describeTableStub.yields(undefined, {Table: {TableStatus: 'ACTIVE'}});
});

test.after(() => {
	sandbox.restore();
});

test('create method returns CreateTable object', t => {
	const query = db.createTable({TableName: 'Table'} as any);

	t.truthy(query instanceof CreateTable);
	t.is(query['table'].name, 'foo.Table');
});

test('throws error if no schema provided', t => {
	t.throws(db.createTable.bind(db), 'Expected `schema` to be of type `object`, got `undefined`');
	t.throws(Table.create.bind(Table), 'Expected `schema` to be of type `object`, got `undefined`');
});

test('throws error if no table name is provided', t => {
	t.throws(db.createTable.bind(db, {}), 'Schema is missing a `TableName`');
});

test.serial('create table', async t => {
	await db.createTable(Object.assign({}, schema)).exec();

	t.deepEqual(createTableStub.lastCall.args[0], {
		TableName: 'foo.Table',
		AttributeDefinitions: [
			{
				AttributeName: 'id',
				AttributeType: 'S'
			}
		],
		KeySchema: [
			{
				AttributeName: 'id',
				KeyType: 'HASH'
			}
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 1,
			WriteCapacityUnits: 1
		}
	});
});

test.serial('create table adjusts the table name', async t => {
	await Table.create(Object.assign({}, schema)).exec();

	t.deepEqual(createTableStub.lastCall.args[0], {
		TableName: 'foo.Bar',
		AttributeDefinitions: [
			{
				AttributeName: 'id',
				AttributeType: 'S'
			}
		],
		KeySchema: [
			{
				AttributeName: 'id',
				KeyType: 'HASH'
			}
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 1,
			WriteCapacityUnits: 1
		}
	});
});

test.serial('create raw table', async t => {
	await db.createRawTable(Object.assign({}, schema)).exec();

	t.deepEqual(createTableStub.lastCall.args[0], {
		TableName: 'Table',
		AttributeDefinitions: [
			{
				AttributeName: 'id',
				AttributeType: 'S'
			}
		],
		KeySchema: [
			{
				AttributeName: 'id',
				KeyType: 'HASH'
			}
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 1,
			WriteCapacityUnits: 1
		}
	});
});

test.serial('await', async t => {
	await db.createTable(Object.assign({}, schema)).wait().exec();

	t.deepEqual(describeTableStub.lastCall.args[0], {TableName: 'foo.Table'});
});

test.serial('error if not connected', async t => {
	const original = db.raw;
	db.raw = undefined;

	await t.throws(db.createTable(Object.assign({}, schema)).exec(), 'Call .connect() before executing queries.');

	db.raw = original;
});
