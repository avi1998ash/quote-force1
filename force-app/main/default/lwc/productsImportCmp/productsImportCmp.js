import { LightningElement, track } from 'lwc';
import insertProducts from '@salesforce/apex/ProductImporterController.insertProducts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const EXPECTED_HEADERS = [
    'Name',
    'QuoteForce__Product_Code__c',
    'QuoteForce__Description__c',
    'QuoteForce__Default_Price__c',
    'QuoteForce__Default_Quantity__c',
    'QuoteForce__Currency__c',
    'QuoteForce__Active__c'
];

const CURRENCY_MAP = {
    INR: 'INR',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    '₹': 'INR',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    'â‚¹': 'INR',
    'â‚¬': 'EUR',
    'Â£': 'GBP'
};

export default class ProductsImportCmp extends LightningElement {
    fileContents = null;
    fileName = '';

    @track previewRows = [];
    @track errorMessage = '';
    @track importResult = '';
    @track loaded = false;

    columns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Product Code', fieldName: 'QuoteForce__Product_Code__c' },
        { label: 'Description', fieldName: 'QuoteForce__Description__c' },
        { label: 'Default Price', fieldName: 'QuoteForce__Default_Price__c', type: 'number' },
        { label: 'Default Quantity', fieldName: 'QuoteForce__Default_Quantity__c', type: 'number' },
        { label: 'Default Currency', fieldName: 'QuoteForce__Currency__c' },
        { label: 'Active', fieldName: 'QuoteForce__Active__c' }
    ];

    downloadTemplate() {
        const header = EXPECTED_HEADERS.join(',') + '\n';

        const sample =
            'Sample Product,PRD001,This is a test product.,499.99,1,USD,TRUE';

        const csvData =
            'data:text/csv;charset=utf-8,' +
            encodeURIComponent(header + sample);

        const link = document.createElement('a');

        link.href = csvData;
        link.download = 'Product_Import_Template.csv';

        this.template.appendChild(link);
        link.click();
        this.template.removeChild(link);
    }

    handleFileChange(event) {
        this.errorMessage = '';
        this.previewRows = [];
        this.importResult = '';

        const [file] = event.target.files;

        if (!file) {
            this.fileContents = null;
            this.fileName = '';
            return;
        }

        this.fileName = file.name;

        const reader = new FileReader();

        reader.onload = () => {
            this.fileContents = reader.result;
        };

        reader.readAsText(file);
    }

    handleValidate() {
        this.errorMessage = '';
        this.previewRows = [];
        this.importResult = '';

        if (!this.fileContents) {
            this.errorMessage = 'Please upload a CSV file first.';
            return;
        }

        const rows = this.parseCsv(this.fileContents);

        if (!rows.length) {
            this.errorMessage = 'CSV is empty or incorrect.';
            return;
        }

        const headers = rows[0].map((header) =>
            header.trim().replace(/^\uFEFF/, '')
        );

        if (
            headers.length !== EXPECTED_HEADERS.length ||
            !EXPECTED_HEADERS.every(
                (header, index) => header === headers[index]
            )
        ) {
            this.errorMessage =
                'CSV header mismatch. Expected: ' +
                EXPECTED_HEADERS.join(', ');

            return;
        }

        const dataRows = rows
            .slice(1)
            .filter((cols) =>
                cols.some((value) => String(value || '').trim() !== '')
            )
            .map((cols, index) => {
                const row = {};

                EXPECTED_HEADERS.forEach((header, colIndex) => {
                    row[header] = (cols[colIndex] || '').trim();
                });

                row._rowIndex = index + 1;

                return row;
            });

        if (!dataRows.length) {
            this.errorMessage =
                'CSV does not contain any data rows.';

            return;
        }

        const validationErrors = [];
        const compositeKeySet = new Set();

        dataRows.forEach((row) => {
            const rowErrors = [];

            row.Name = row.Name ? row.Name.trim() : '';

            row.QuoteForce__Description__c =
                row.QuoteForce__Description__c
                    ? row.QuoteForce__Description__c.trim()
                    : '';

            if (!row.Name) {
                rowErrors.push('Name required');
            }

            if (!row.QuoteForce__Product_Code__c) {
                rowErrors.push(
                    'QuoteForce__Product_Code__c required'
                );
            } else {
                row.QuoteForce__Product_Code__c =
                    row.QuoteForce__Product_Code__c
                        .trim()
                        .toUpperCase();
            }

            const price = Number(
                row.QuoteForce__Default_Price__c
            );

            if (
                row.QuoteForce__Default_Price__c === '' ||
                Number.isNaN(price)
            ) {
                rowErrors.push(
                    'QuoteForce__Default_Price__c must be number'
                );
            } else if (price < 0) {
                rowErrors.push(
                    'QuoteForce__Default_Price__c must be 0 or greater'
                );
            } else {
                row.QuoteForce__Default_Price__c = price;
            }

            const quantity = Number.parseInt(
                row.QuoteForce__Default_Quantity__c,
                10
            );

            if (
                row.QuoteForce__Default_Quantity__c === '' ||
                Number.isNaN(quantity)
            ) {
                rowErrors.push(
                    'QuoteForce__Default_Quantity__c must be integer'
                );
            } else if (quantity < 1) {
                rowErrors.push(
                    'QuoteForce__Default_Quantity__c must be at least 1'
                );
            } else {
                row.QuoteForce__Default_Quantity__c = quantity;
            }

            const normalizedCurrency = this.normalizeCurrency(
                row.QuoteForce__Currency__c
            );

            if (
                row.QuoteForce__Currency__c &&
                !normalizedCurrency
            ) {
                rowErrors.push(
                    'QuoteForce__Currency__c must be USD, INR, EUR, GBP or valid symbol'
                );
            } else {
                row.QuoteForce__Currency__c =
                    normalizedCurrency;
            }

            const activeValue = String(
                row.QuoteForce__Active__c || ''
            )
                .trim()
                .toUpperCase();

            if (
                activeValue === 'TRUE' ||
                activeValue === 'FALSE'
            ) {
                row.QuoteForce__Active__c =
                    activeValue === 'TRUE';
            } else {
                rowErrors.push(
                    'QuoteForce__Active__c must be TRUE or FALSE'
                );
            }

            const compositeKey =
                `${row.QuoteForce__Product_Code__c || ''}::${row.QuoteForce__Currency__c || ''}`;

            if (row.QuoteForce__Product_Code__c) {
                if (compositeKeySet.has(compositeKey)) {
                    rowErrors.push(
                        'Duplicate QuoteForce__Product_Code__c + QuoteForce__Currency__c in CSV'
                    );
                } else {
                    compositeKeySet.add(compositeKey);
                }
            }

            if (rowErrors.length) {
                validationErrors.push(
                    `Row ${row._rowIndex}: ${rowErrors.join('; ')}`
                );
            }
        });

        this.previewRows = dataRows;

        if (validationErrors.length) {
            this.errorMessage =
                'Validation errors:\n' +
                validationErrors.join('\n');

            return;
        }

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Validation Success',
                message: 'Preview ready!',
                variant: 'success'
            })
        );
    }

handleClear() {
    if (!this.fileContents) {
        this.errorMessage = 'No file is selected.';
        return;
    }

    this.fileContents = null;
    this.fileName = '';
    this.previewRows = [];
    this.errorMessage = '';
    this.importResult = '';

    const fileInput = this.template.querySelector('lightning-input[data-id="products-file"]');
    if (fileInput) {
        fileInput.value = null;
    }
}

    handleImport() {
        this.errorMessage = '';

        if (!this.previewRows.length) {
            this.errorMessage = 'Nothing to import.';
            return;
        }

        const payload = this.previewRows.map((row) => ({
            Name: row.Name,
            QuoteForce__Product_Code__c:
                row.QuoteForce__Product_Code__c,
            QuoteForce__Description__c:
                row.QuoteForce__Description__c,
            QuoteForce__Default_Price__c:
                row.QuoteForce__Default_Price__c,
            QuoteForce__Default_Quantity__c:
                row.QuoteForce__Default_Quantity__c,
            QuoteForce__Currency__c:
                row.QuoteForce__Currency__c,
            QuoteForce__Active__c:
                row.QuoteForce__Active__c
        }));

        this.loaded = true;

        insertProducts({
            productsJson: JSON.stringify(payload)
        })
            .then((response) => {
                if (
                    response.errors &&
                    response.errors.length
                ) {
                    this.errorMessage =
                        response.errors.join('\n');

                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Import Failed',
                            message: response.errors[0],
                            variant: 'error'
                        })
                    );

                    return;
                }

                this.importResult =
                    `Inserted: ${response.insertedCount}`;

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Import Complete',
                        message: this.importResult,
                        variant: 'success'
                    })
                );

                this.handleClear();
            })
            .catch((error) => {
                this.errorMessage =
                    error.body?.message || error.message;

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: this.errorMessage,
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    normalizeCurrency(value) {
        const rawValue = String(value || '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '');

        if (!rawValue) {
            return null;
        }

        const symbolMatch =
            rawValue.match(/[₹$€£â‚¹â‚¬Â£]/);

        if (
            symbolMatch &&
            CURRENCY_MAP[symbolMatch[0]]
        ) {
            return CURRENCY_MAP[symbolMatch[0]];
        }

        const codeMatch =
            rawValue.match(/[A-Z]{3}/);

        return codeMatch
            ? CURRENCY_MAP[codeMatch[0]] || null
            : null;
    }

    parseCsv(content) {
        const text = String(content || '')
            .replace(/\r/g, '')
            .trim();

        if (!text) {
            return [];
        }

        const rows = [];

        let currentValue = '';
        let currentRow = [];
        let insideQuotes = false;

        for (
            let index = 0;
            index < text.length;
            index += 1
        ) {
            const char = text[index];
            const nextChar = text[index + 1];

            if (char === '"') {
                if (
                    insideQuotes &&
                    nextChar === '"'
                ) {
                    currentValue += '"';
                    index += 1;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (
                char === ',' &&
                !insideQuotes
            ) {
                currentRow.push(currentValue);
                currentValue = '';
            } else if (
                char === '\n' &&
                !insideQuotes
            ) {
                currentRow.push(currentValue);
                rows.push(currentRow);

                currentRow = [];
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        currentRow.push(currentValue);
        rows.push(currentRow);

        return rows;
    }
}