import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { ZenEngine } from '@gorules/zen-engine';

export class GorulesNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gorules',
		icon: 'file:logo.svg',
		name: 'gorulesNode',
		group: ['transform'],
		version: 1,
		description: 'Gorules Runner',
		defaults: {
			name: 'Gorules Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Gorules JSON Data',
				name: 'jsonData',
				type: 'string',
				default: '{}',
				required: true,
				description: 'Please enter the JSON data',
			},
			{
				displayName: 'Payload',
				name: 'payload',
				type: 'string',
				default: '{{ $json }}',
				requiresDataPath: 'single',
				placeholder: 'Payload Object'
			},
			{
				displayName: 'Trace',
				name: 'trace',
				type: 'boolean',
				default: false,
				placeholder: 'Trace'
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		let data: any;

		const jsonData = this.getNodeParameter('jsonData', 0) as string;
		data = JSON.parse(jsonData);

		const engine = new ZenEngine();

		const trace = this.getNodeParameter('trace', 0, false) as boolean;

		const decision = engine.createDecision(data);

		const items = this.getInputData();

		let item: INodeExecutionData;
		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {

				let sendPayload  = {};

				const payload = this.getNodeParameter('payload', itemIndex, '') as IDataObject;

				if (payload) {
					sendPayload = JSON.parse(payload.toString());
				}else{
					sendPayload = items[itemIndex].json;
				}

				let data = await decision.evaluate(sendPayload, { trace }) as unknown as IDataObject;
				item = items[itemIndex];
				item.json = data;
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [items];
	}
}
