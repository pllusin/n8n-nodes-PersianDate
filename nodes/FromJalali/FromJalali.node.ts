import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import moment from 'moment-jalaali';

export class FromJalali implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'From Jalali',
		name: 'fromJalali',
		icon: 'file:persian-calendar.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["inputType"] + ": " + $parameter["outputFormat"]}}',
		description: 'Convert Persian (Jalali) dates to Gregorian calendar',
		defaults: {
			name: 'From Jalali',
		},
		inputs: [{ type: NodeConnectionType.Main }],
		outputs: [{ type: NodeConnectionType.Main }],
		properties: [
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'Complete Date',
						value: 'completeDate',
						description: 'Full Persian date in various formats',
					},
					{
						name: 'Separate Values',
						value: 'separateValues',
						description: 'Year, month, and day as separate inputs',
					},
				],
				default: 'completeDate',
				description: 'The format of the input date',
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['completeDate'],
					},
				},
				default: '',
				placeholder: '1402/12/25 یا ۱۴۰۲/۱۲/۲۵',
				description: 'Persian date in YYYY/MM/DD format (can use Persian or English numerals)',
			},
			{
				displayName: 'Year',
				name: 'year',
				type: 'number',
				displayOptions: {
					show: {
						inputType: ['separateValues'],
					},
				},
				default: 1402,
				description: 'Persian calendar year',
			},
			{
				displayName: 'Month',
				name: 'month',
				type: 'options',
				displayOptions: {
					show: {
						inputType: ['separateValues'],
					},
				},
				options: [
					{ name: 'Farvardin', value: 1 },
					{ name: 'Ordibehesht', value: 2 },
					{ name: 'Khordad', value: 3 },
					{ name: 'Tir', value: 4 },
					{ name: 'Mordad', value: 5 },
					{ name: 'Shahrivar', value: 6 },
					{ name: 'Mehr', value: 7 },
					{ name: 'Aban', value: 8 },
					{ name: 'Azar', value: 9 },
					{ name: 'Dey', value: 10 },
					{ name: 'Bahman', value: 11 },
					{ name: 'Esfand', value: 12 },
				],
				default: 1,
				description: 'Persian calendar month',
			},
			{
				displayName: 'Day',
				name: 'day',
				type: 'number',
				displayOptions: {
					show: {
						inputType: ['separateValues'],
					},
				},
				default: 1,
				description: 'Persian calendar day',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'All Formats',
						value: 'all',
						description: 'Returns date in all available formats',
					},
					{
						name: 'Date String',
						value: 'dateString',
						description: 'Returns date as a string (e.g., "Wed May 27 2020")',
					},
					{
						name: 'ISO String',
						value: 'isoString',
						description: 'Returns date in ISO format (e.g., "2020-05-27T00:00:00.000Z")',
					},
					{
						name: 'Localized String',
						value: 'localizedString',
						description: 'Returns date in localized format based on system locale',
					},
					{
						name: 'Standard Format',
						value: 'standardString',
						description: 'Returns date in standard format (e.g., "5/27/2020")',
					},
					{
						name: 'Timestamp (Milliseconds)',
						value: 'timestamp',
						description: 'Returns date as Unix timestamp in milliseconds',
					},
					{
						name: 'Timestamp (Seconds)',
						value: 'timestampSeconds',
						description: 'Returns date as Unix timestamp in seconds',
					},
				],
				default: 'all',
				description: 'The format of the output date',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const inputType = this.getNodeParameter('inputType', i) as string;
			const outputFormat = this.getNodeParameter('outputFormat', i) as string;

			let jalaliDate: moment.Moment;

			try {
				if (inputType === 'completeDate') {
					const dateStr = this.getNodeParameter('date', i) as string;
					if (!dateStr.trim()) {
						throw new NodeOperationError(this.getNode(), 'Date input cannot be empty');
					}
					// Convert Persian numerals to English if present
					const englishNumerals = dateStr.replace(/[۰-۹]/g, d => String('0123456789'.indexOf(d)));
					jalaliDate = moment(englishNumerals, 'jYYYY/jMM/jDD');
				} else {
					const year = this.getNodeParameter('year', i) as number;
					const month = this.getNodeParameter('month', i) as number;
					const day = this.getNodeParameter('day', i) as number;
					
					if (!year || !month || !day) {
						throw new NodeOperationError(this.getNode(), 'Year, month and day cannot be empty or zero');
					}
					
					jalaliDate = moment(`${year}/${month}/${day}`, 'jYYYY/jM/jD');
				}

				if (!jalaliDate.isValid()) {
					throw new NodeOperationError(this.getNode(), 'Invalid Persian date format or values');
				}

				const gregorianDate = jalaliDate.toDate();
				let result: { [key: string]: any } = {};

				if (outputFormat === 'all') {
					result = {
						isoString: gregorianDate.toISOString(),
						timestamp: gregorianDate.getTime(),
						timestampSeconds: Math.floor(gregorianDate.getTime() / 1000),
						dateString: gregorianDate.toDateString(),
						localizedString: gregorianDate.toLocaleString(),
						standardString: moment(gregorianDate).format('YYYY/MM/DD'),
						utc: gregorianDate.toUTCString(),
						time: gregorianDate.toTimeString(),
					};
				} else {
					switch (outputFormat) {
						case 'isoString':
							result = { date: gregorianDate.toISOString() };
							break;
						case 'timestamp':
							result = { date: gregorianDate.getTime() };
							break;
						case 'timestampSeconds':
							result = { date: Math.floor(gregorianDate.getTime() / 1000) };
							break;
						case 'dateString':
							result = { date: gregorianDate.toDateString() };
							break;
						case 'localizedString':
							result = { date: gregorianDate.toLocaleString() };
							break;
						case 'standardString':
							result = { date: moment(gregorianDate).format('YYYY/MM/DD') };
							break;
					}
				}

				returnData.push({
					json: {
						...items[i].json,
						...result,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							...items[i].json,
							error: error.message,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
} 