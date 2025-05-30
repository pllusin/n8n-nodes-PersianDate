import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
import moment from 'moment-jalaali';

export class ToJalali implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'To Jalali',
		name: 'toJalali',
		icon: 'file:persian-calendar.svg',
		group: ['transform'],
		version: 1,
		description: 'Converts Gregorian dates to Persian (Jalali/Shamsi) calendar',
		defaults: {
			name: 'To Jalali',
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
						value: 'complete',
						description: 'Full date string or ISO format',
					},
					{
						name: 'Separate Values',
						value: 'separate',
						description: 'Enter year, month, and day separately',
					},
				],
				default: 'complete',
				description: 'Choose how to input the date',
			},
			{
				displayName: 'Date Value',
				name: 'dateValue',
				type: 'string',
				default: '',
				required: true,
				description: 'The date value to convert (e.g. {{ $JSON.date }})',
				displayOptions: {
					show: {
						inputType: ['complete'],
					},
				},
			},
			{
				displayName: 'Year',
				name: 'year',
				type: 'number',
				default: 0,
				description: 'Gregorian year (e.g. 2025)',
				displayOptions: {
					show: {
						inputType: ['separate'],
					},
				},
			},
			{
				displayName: 'Month',
				name: 'month',
				type: 'number',
				default: 0,
				description: 'Month number (1-12)',
				displayOptions: {
					show: {
						inputType: ['separate'],
					},
				},
			},
			{
				displayName: 'Day',
				name: 'day',
				type: 'number',
				default: 0,
				description: 'Day of month (1-31)',
				displayOptions: {
					show: {
						inputType: ['separate'],
					},
				},
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'Custom Format',
						value: 'custom',
					},
					{
						name: 'Day Month',
						value: 'jDD jMMMM',
					},
					{
						name: 'Day Month Year',
						value: 'jDD jMMMM jYYYY',
					},
					{
						name: 'Full Date and Time',
						value: 'jDD jMMMM jYYYY HH:mm:ss',
					},
					{
						name: 'Month and Year',
						value: 'jMMMM jYYYY',
					},
					{
						name: 'Persian Text',
						value: 'persian_text',
					},
					{
						name: 'Short Date',
						value: 'jYY/jMM/jDD',
					},
					{
						name: 'Short Month and Year',
						value: 'jMM/jYY',
					},
					{
						name: 'Weekday and Date',
						value: 'dddd jDD jMMMM',
					},
					{
						name: 'Year Month Day',
						value: 'jYYYY jMMMM jD',
					},
					{
						name: 'Year/Month/Day',
						value: 'jYYYY/jMM/jDD',
					},
				],
				default: 'jYYYY/jMM/jDD',
				description: 'The format of the output date',
			},
			{
				displayName: 'Custom Format',
				name: 'customFormat',
				type: 'string',
				default: 'jYYYY/jMM/jDD',
				description: 'Use "j" prefix for Jalali dates (e.g. jYYYY=year, jMM=month, jDD=day)',
				displayOptions: {
					show: {
						outputFormat: ['custom'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Convert Numbers to Persian',
						name: 'persianNumbers',
						type: 'boolean',
						default: false,
						description: 'Whether to convert numbers to Persian digits',
					},
					{
						displayName: 'Add Numeric Values',
						name: 'addNumericValues',
						type: 'boolean',
						default: false,
						description: 'Whether to add year, month, and day as separate numeric fields',
					},
					{
						displayName: 'Add Month Name',
						name: 'addMonthName',
						type: 'boolean',
						default: false,
						description: 'Whether to add Persian month name as a separate field',
					},
					{
						displayName: 'Add Weekday',
						name: 'addWeekday',
						type: 'boolean',
						default: false,
						description: 'Whether to add the day of week in Persian',
					},
				],
			},
		],
	};

	// Function to convert English numbers to Persian
	private static toPersianNumbers(str: string): string {
		const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
		return str.replace(/[0-9]/g, (d) => persianNumbers[parseInt(d)]);
	}

	// Function to get Persian month name
	private static getPersianMonthName(month: number): string {
		const months = [
			'فروردین',
			'اردیبهشت',
			'خرداد',
			'تیر',
			'مرداد',
			'شهریور',
			'مهر',
			'آبان',
			'آذر',
			'دی',
			'بهمن',
			'اسفند',
		];
		return months[month - 1];
	}

	// Function to get Persian weekday name
	private static getPersianWeekday(weekday: number): string {
		const weekdays = [
			'یکشنبه',
			'دوشنبه',
			'سه‌شنبه',
			'چهارشنبه',
			'پنج‌شنبه',
			'جمعه',
			'شنبه',
		];
		return weekdays[weekday];
	}

	// Function to convert number to Persian text
	private static numberToPersianText(num: number): string {
		const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده',
			'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده', 'بیست',
			'بیست و یک', 'بیست و دو', 'بیست و سه', 'بیست و چهار', 'بیست و پنج', 'بیست و شش',
			'بیست و هفت', 'بیست و هشت', 'بیست و نه', 'سی', 'سی و یک'];
		return units[num] || num.toString();
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const inputType = this.getNodeParameter('inputType', i) as string;
				let mDate: moment.Moment;

				if (inputType === 'complete') {
					const inputDate = this.getNodeParameter('dateValue', i) as string;
					if (!inputDate) {
						throw new NodeOperationError(
							this.getNode(),
							'No date value provided',
						);
					}

					// Try different date formats
					mDate = moment(inputDate as moment.MomentInput);
					if (!mDate.isValid()) {
						// Try parsing with the English text format directly
						const match = inputDate.match(/([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)?\s+(\d+)(?:,\s+(\d+):(\d+):(\d+)\s+(am|pm))?/i);
						if (match) {
							const [, month, day, year, hour = '0', minute = '0', second = '0', ampm = 'am'] = match;
							const time24 = moment(`${hour}:${minute}:${second} ${ampm}`, 'h:mm:ss a').format('HH:mm:ss');
							const dateStr = `${year}-${moment().month(month).format('MM')}-${day.padStart(2, '0')} ${time24}`;
							mDate = moment(dateStr);
						} else {
							mDate = moment(inputDate as moment.MomentInput, [
								'YYYY-MM-DD',
								'YYYY/MM/DD',
								'DD-MM-YYYY',
								'DD/MM/YYYY',
								'MM-DD-YYYY',
								'MM/DD/YYYY',
								'YYYY-MM-DD HH:mm:ss',
								'YYYY/MM/DD HH:mm:ss',
								'DD-MM-YYYY HH:mm:ss',
								'DD/MM/YYYY HH:mm:ss',
								'MM-DD-YYYY HH:mm:ss',
								'MM/DD/YYYY HH:mm:ss',
								'X', // Unix timestamp
								'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO 8601
							]);
						}
					}

					if (!mDate.isValid()) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid date format. Please use a standard date format like YYYY-MM-DD or a readable format like "May 29th 2025, 2:20:37 pm"',
						);
					}
				} else {
					// Separate values
					const year = this.getNodeParameter('year', i, 0) as number;
					const month = this.getNodeParameter('month', i, 0) as number;
					const day = this.getNodeParameter('day', i, 0) as number;

					if (!year && !month && !day) {
						throw new NodeOperationError(
							this.getNode(),
							'At least one of year, month, or day must be provided',
						);
					}

					// Create separate outputs based on provided values
					const newItem: INodeExecutionData = {
						json: {},
					};

					const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
						persianNumbers?: boolean;
						addNumericValues?: boolean;
						addMonthName?: boolean;
						addWeekday?: boolean;
					};

					if (year) {
						const yearDate = moment({ year });
						const jYear = yearDate.jYear();
						newItem.json.jalaliYear = additionalOptions.persianNumbers
							? ToJalali.toPersianNumbers(jYear.toString())
							: jYear;
					}

					if (month) {
						const monthDate = moment().month(month - 1);
						const jMonth = monthDate.jMonth() + 1;
						newItem.json.jalaliMonth = additionalOptions.persianNumbers
							? ToJalali.toPersianNumbers(jMonth.toString())
							: jMonth;
						newItem.json.jalaliMonthName = ToJalali.getPersianMonthName(jMonth);
					}

					if (day) {
						const dayDate = moment().date(day);
						const jDay = dayDate.jDate();
						newItem.json.jalaliDay = additionalOptions.persianNumbers
							? ToJalali.toPersianNumbers(jDay.toString())
							: jDay;
					}

					// Combine values if multiple are provided
					if (year && month && !day) {
						const yearMonthDate = moment({ year, month: month - 1 });
						const yearMonthFormatted = yearMonthDate.format('jYYYY/jMM');
						const yearMonthText = `${yearMonthDate.format('jYYYY')} ${ToJalali.getPersianMonthName(yearMonthDate.jMonth() + 1)}`;
						newItem.json.jalaliYearMonth = additionalOptions.persianNumbers
							? ToJalali.toPersianNumbers(yearMonthFormatted)
							: yearMonthFormatted;
						newItem.json.jalaliYearMonthText = additionalOptions.persianNumbers
							? ToJalali.toPersianNumbers(yearMonthText)
							: yearMonthText;
					}

					if (!year && month && day) {
						const monthDayDate = moment().month(month - 1).date(day);
						const monthDayFormatted = monthDayDate.format('jMM/jDD');
						const monthDayText = `${ToJalali.numberToPersianText(monthDayDate.jDate())} ${ToJalali.getPersianMonthName(monthDayDate.jMonth() + 1)}`;
						newItem.json.jalaliMonthDay = additionalOptions.persianNumbers
							? ToJalali.toPersianNumbers(monthDayFormatted)
							: monthDayFormatted;
						newItem.json.jalaliMonthDayText = monthDayText;
					}

					if (year && month && day) {
						mDate = moment({ year, month: month - 1, date: day });
						if (!mDate.isValid()) {
							throw new NodeOperationError(
								this.getNode(),
								'Invalid date values provided',
							);
						}
					} else {
						returnData.push(newItem);
						continue;
					}
				}

				if (!mDate.isValid()) {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid date format or values',
					);
				}

				const outputFormat = this.getNodeParameter('outputFormat', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					persianNumbers?: boolean;
					addNumericValues?: boolean;
					addMonthName?: boolean;
					addWeekday?: boolean;
				};

				let jalaliDate: string;
				if (outputFormat === 'persian_text') {
					const weekday = ToJalali.getPersianWeekday(mDate.day());
					const day = ToJalali.numberToPersianText(mDate.jDate());
					const month = ToJalali.getPersianMonthName(mDate.jMonth() + 1);
					const year = mDate.jYear().toString();
					jalaliDate = `${weekday} ${day} ${month} ${additionalOptions.persianNumbers ? ToJalali.toPersianNumbers(year) : year}`;
				} else {
					let format = outputFormat;
					if (format === 'custom') {
						format = this.getNodeParameter('customFormat', i) as string;
					}
					jalaliDate = mDate.format(format);
					if (additionalOptions.persianNumbers) {
						jalaliDate = ToJalali.toPersianNumbers(jalaliDate);
					}
				}

				const newItem: INodeExecutionData = {
					json: {
						jalaliDate,
					},
				};

				if (additionalOptions.addNumericValues) {
					const jYear = mDate.jYear();
					const jMonth = mDate.jMonth() + 1;
					const jDay = mDate.jDate();

					newItem.json.jalaliYear = additionalOptions.persianNumbers
						? ToJalali.toPersianNumbers(jYear.toString())
						: jYear;
					newItem.json.jalaliMonth = additionalOptions.persianNumbers
						? ToJalali.toPersianNumbers(jMonth.toString())
						: jMonth;
					newItem.json.jalaliDay = additionalOptions.persianNumbers
						? ToJalali.toPersianNumbers(jDay.toString())
						: jDay;
				}

				if (additionalOptions.addMonthName) {
					const jMonth = mDate.jMonth() + 1;
					newItem.json.jalaliMonthName = ToJalali.getPersianMonthName(jMonth);
				}

				if (additionalOptions.addWeekday) {
					newItem.json.jalaliWeekday = ToJalali.getPersianWeekday(mDate.day());
				}

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
} 