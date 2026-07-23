import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import GetProducts from '@salesforce/apex/ProductConfigureController.GetProducts';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';
import upsertPriceBook from '@salesforce/apex/ProductConfigureController.upsertPriceBook';
import deletePriceBook from '@salesforce/apex/ProductConfigureController.deletePriceBook';
import listPriceBookEntries from '@salesforce/apex/ProductConfigureController.listPriceBookEntries';
import upsertPriceBookEntry from '@salesforce/apex/ProductConfigureController.upsertPriceBookEntry';
import deletePriceBookEntry from '@salesforce/apex/ProductConfigureController.deletePriceBookEntry';
import clonePriceBookEntries from '@salesforce/apex/ProductConfigureController.clonePriceBookEntries';

const EMPTY_BOOK_FORM = {
    Id: null,
    Name: '',
    QuoteForce__Currency__c: 'USD',
    QuoteForce__Description__c: '',
    QuoteForce__Is_Active__c: true,
    QuoteForce__Is_Default__c: false
};

const EMPTY_ENTRY_FORM = {
    Id: null,
    QuoteForce__Price_Book__c: '',
    QuoteForce__Product__c: '',
    QuoteForce__Unit_Price__c: null,
    QuoteForce__Currency__c: '',
    QuoteForce__Is_Active__c: true
};

export default class PriceBookManager extends LightningElement {
    isCurrencyDisabled = false;
    @api viewMode = 'books';
    @track priceBooks = [];
    @track priceBookEntries = [];
    @track productOptions = [];
    @track priceBookOptions = [];
    @track bookForm = { ...EMPTY_BOOK_FORM };
    @track entryForm = { ...EMPTY_ENTRY_FORM };
    @track cloneForm = {
    sourcePriceBookId: '',
    targetPriceBookId: '',
    overwriteExisting: false
    };

    isLoading = false;
    isPriceBookModalOpen = false;
    isPriceBookEntryModalOpen = false;
    isCloneModalOpen = false;
    isDeleteConfirmOpen = false;
    deleteTargetId;
    deleteTargetType;

    bookSearchKey = '';
    bookCurrencyFilter = '';
    entrySearchKey = '';
    entryCurrencyFilter = '';
    selectedEntryPriceBookId = '';
    selectedEntryProductId = '';

    currencyOptions = [
        { label: 'All', value: '' },
        { label: '($) USD', value: 'USD' },
        { label: '(Rs) INR', value: 'INR' },
        { label: '(EUR) EUR', value: 'EUR' },
        { label: '(GBP) GBP', value: 'GBP' }
    ];

    connectedCallback() {
        this.initialize();
    }
     get priceBookModalTitle() {
        return this.bookForm.Id ? 'Edit Price Book' : 'Create Price Book';
    }
    get priceBookButtonLabel() {
    return this.bookForm.Id ? 'Update' : 'Save';
}
get priceBookEntryModalTitle() {
    return this.entryForm.Id 
        ? 'Edit Price Book Entry' 
        : 'Create Price Book Entry';
}

    get isBooksView() {
        return this.viewMode !== 'entries';
    }

    get hasPriceBooks() {
        return this.priceBooks.length > 0;
    }

    get hasPriceBookEntries() {
        return this.priceBookEntries.length > 0;
    }

    get currentEntryProductCode() {
        const selectedProduct = this.productOptions.find(
            (option) => option.value === this.entryForm.QuoteForce__Product__c
        );
        return selectedProduct?.productCode || '';
    }

    get deleteModalTitle() {
        return this.deleteTargetType === 'entry' ? 'Delete Price Book Entry' : 'Delete Price Book';
    }

    get deleteModalMessage() {
        return this.deleteTargetType === 'entry'
            ? 'Are you sure you want to delete this custom Price Book Entry?'
            : 'Are you sure you want to delete this Price Book and its custom entries?';
    }

    async initialize() {
        this.isLoading = true;
        try {
            await Promise.all([
                this.loadProducts(),
                this.loadPriceBooks(),
                this.loadPriceBookEntries()
            ]);
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async loadProducts() {
        const result = await GetProducts({ searchKey: '', currencyFilter: '' });
       this.productOptions = [
    { label: 'All Products', value: '' },   // ✅ ADD THIS
    ...(result || []).map((product) => ({
        label: product.QuoteForce__Product_Code__c
            ? `${product.Name} (${product.QuoteForce__Product_Code__c})`
            : product.Name,
        value: product.Id,
        productCode: product.QuoteForce__Product_Code__c,
        currencyCode: product.QuoteForce__Currency__c
    }))
];
    }

    async loadPriceBooks() {
        const result = await listPriceBooks({
            searchKey: this.bookSearchKey,
            currencyFilter: this.bookCurrencyFilter,
            activeOnly: false
        });

        this.priceBooks = (result || []).map((priceBook) => ({
            ...priceBook,
            statusLabel: priceBook.QuoteForce__Is_Active__c ? 'Active' : 'Inactive',
            defaultLabel: priceBook.QuoteForce__Is_Default__c ? 'Default' : ''
        }));

       this.priceBookOptions = [
    { label: 'All Price Books', value: '' },
    ...this.priceBooks
        .filter(pb => pb.QuoteForce__Is_Active__c === true)
        .map((priceBook) => ({
            label: priceBook.QuoteForce__Currency__c
                ? `${priceBook.Name} (${priceBook.QuoteForce__Currency__c})`
                : priceBook.Name,
            value: priceBook.Id,
            currencyCode: priceBook.QuoteForce__Currency__c
        }))
];
    }

    async loadPriceBookEntries() {
        const result = await listPriceBookEntries({
            searchKey: this.entrySearchKey,
            priceBookId: this.selectedEntryPriceBookId || null,
            productId: this.selectedEntryProductId || null,
            currencyFilter: this.entryCurrencyFilter,
            activeOnly: false
        });

        this.priceBookEntries = (result || []).map((entry) => ({
            ...entry,
            priceBookName: entry.QuoteForce__Price_Book__r?.Name,
            productName: entry.QuoteForce__Product__r?.Name,
            productCode: entry.QuoteForce__Product_Code__c || entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c,
            activeLabel: entry.QuoteForce__Is_Active__c ? 'Yes' : 'No'
        }));
    }

    async refreshPriceBooksAndEntries() {
        this.isLoading = true;
        try {
            await Promise.all([this.loadPriceBooks(), this.loadPriceBookEntries()]);
        } finally {
            this.isLoading = false;
        }
    }

    handleBookSearchChange(event) {
        this.bookSearchKey = event.target.value;
        this.loadPriceBooks().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    handleBookCurrencyChange(event) {
        this.bookCurrencyFilter = event.detail.value;
        this.loadPriceBooks().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    handleEntrySearchChange(event) {
        this.entrySearchKey = event.target.value;
        this.loadPriceBookEntries().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    handleEntryFilterChange(event) {
        const { name, value } = event.target;
        if (name === 'priceBookFilter') {
            this.selectedEntryPriceBookId = value;
        } else if (name === 'productFilter') {
            this.selectedEntryProductId = value;
        } else if (name === 'currencyFilter') {
            this.entryCurrencyFilter = value;
        }

        this.loadPriceBookEntries().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    openNewPriceBookModal() {
        this.bookForm = { ...EMPTY_BOOK_FORM };
        this.isPriceBookModalOpen = true;
    }

    openEditPriceBookModal(event) {
        const recordId = event.currentTarget.dataset.id;
        const selectedRecord = this.priceBooks.find((priceBook) => priceBook.Id === recordId);
        if (!selectedRecord) {
            return;
        }

        this.bookForm = {
            Id: selectedRecord.Id,
            Name: selectedRecord.Name,
            QuoteForce__Currency__c: selectedRecord.QuoteForce__Currency__c || 'USD',
            QuoteForce__Description__c: selectedRecord.QuoteForce__Description__c || '',
            QuoteForce__Is_Active__c: selectedRecord.QuoteForce__Is_Active__c,
            QuoteForce__Is_Default__c: selectedRecord.QuoteForce__Is_Default__c
        };
        this.isPriceBookModalOpen = true;
    }

    closePriceBookModal() {
        this.isPriceBookModalOpen = false;
        this.bookForm = { ...EMPTY_BOOK_FORM };
    }

   /* handleBookFormChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);
        this.bookForm = {
            ...this.bookForm,
            [fieldName]: value
        };
    }*/

    async savePriceBook() {
        if (!this.bookForm.Name?.trim()) {
            this.showToast('Error', 'Price Book name is required.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            await upsertPriceBook({
                priceBookRecord: {
                    Id: this.bookForm.Id,
                    Name: this.bookForm.Name.trim(),
                    QuoteForce__Currency__c: this.bookForm.QuoteForce__Currency__c || null,
                    QuoteForce__Description__c: this.bookForm.QuoteForce__Description__c,
                    QuoteForce__Is_Active__c: this.bookForm.QuoteForce__Is_Active__c,
                    QuoteForce__Is_Default__c: this.bookForm.QuoteForce__Is_Default__c
                }
            });

            this.closePriceBookModal();
            await this.refreshPriceBooksAndEntries();
            this.showToast('Success', 'Price Book saved successfully.', 'success');
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    confirmDeletePriceBook(event) {
        this.deleteTargetId = event.currentTarget.dataset.id;
        this.deleteTargetType = 'book';
        this.isDeleteConfirmOpen = true;
    }

  openNewPriceBookEntryModal() {
    this.entryForm = {
        ...EMPTY_ENTRY_FORM,
        QuoteForce__Price_Book__c: this.selectedEntryPriceBookId || ''
    };

    const selectedPriceBook = this.priceBookOptions.find(
        (option) => option.value === this.entryForm.QuoteForce__Price_Book__c
    );
    if (selectedPriceBook?.currencyCode) {
        this.entryForm.QuoteForce__Currency__c = selectedPriceBook.currencyCode;
        this.isCurrencyDisabled = true;   // ✅ add this
    } else {
        this.isCurrencyDisabled = false;  // ✅ add this
    }
    this.isPriceBookEntryModalOpen = true;
}

    openEditPriceBookEntryModal(event) {
        const recordId = event.currentTarget.dataset.id;
        const selectedRecord = this.priceBookEntries.find((entry) => entry.Id === recordId);
        if (!selectedRecord) {
            return;
        }

        this.entryForm = {
            Id: selectedRecord.Id,
            QuoteForce__Price_Book__c: selectedRecord.QuoteForce__Price_Book__c,
            QuoteForce__Product__c: selectedRecord.QuoteForce__Product__c,
            QuoteForce__Unit_Price__c: selectedRecord.QuoteForce__Unit_Price__c,
            QuoteForce__Currency__c: selectedRecord.QuoteForce__Currency__c || '',
            QuoteForce__Is_Active__c: selectedRecord.QuoteForce__Is_Active__c
        };
         this.isCurrencyDisabled = !!selectedRecord.QuoteForce__Price_Book__c;
        this.isPriceBookEntryModalOpen = true;
    }

    closePriceBookEntryModal() {
        this.isPriceBookEntryModalOpen = false;
        this.entryForm = { ...EMPTY_ENTRY_FORM };
         this.isCurrencyDisabled = false;
    }

    handleEntryFormChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);

        this.entryForm = {
            ...this.entryForm,
            [fieldName]: value
        };

      if (fieldName === 'QuoteForce__Price_Book__c') {
    const selectedPriceBook = this.priceBookOptions.find(
        (option) => option.value === value
    );
    if (selectedPriceBook?.currencyCode) {
        this.entryForm = {
            ...this.entryForm,
            QuoteForce__Price_Book__c: value,
            QuoteForce__Currency__c: selectedPriceBook.currencyCode
        };
        this.isCurrencyDisabled = true;   // ✅ lock currency
    } else {
        // "All Price Books" selected — reset
        this.entryForm = {
            ...this.entryForm,
            QuoteForce__Price_Book__c: value,
            QuoteForce__Currency__c: ''
        };
        this.isCurrencyDisabled = false;  // ✅ unlock
    }
}
    }

    async savePriceBookEntry() {
        if (!this.entryForm.QuoteForce__Price_Book__c || !this.entryForm.QuoteForce__Product__c) {
            this.showToast('Error', 'Price Book and Product are required.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            await upsertPriceBookEntry({
                entryRecord: {
                    Id: this.entryForm.Id,
                    QuoteForce__Price_Book__c: this.entryForm.QuoteForce__Price_Book__c,
                    QuoteForce__Product__c: this.entryForm.QuoteForce__Product__c,
                    QuoteForce__Unit_Price__c:
                        this.entryForm.QuoteForce__Unit_Price__c === null || this.entryForm.QuoteForce__Unit_Price__c === ''
                            ? null
                            : Number(this.entryForm.QuoteForce__Unit_Price__c),
                    QuoteForce__Currency__c: this.entryForm.QuoteForce__Currency__c || null,
                    QuoteForce__Is_Active__c: this.entryForm.QuoteForce__Is_Active__c
                }
            });

            this.closePriceBookEntryModal();
            await this.refreshPriceBooksAndEntries();
            this.showToast('Success', 'Price Book Entry saved successfully.', 'success');
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    confirmDeletePriceBookEntry(event) {
        this.deleteTargetId = event.currentTarget.dataset.id;
        this.deleteTargetType = 'entry';
        this.isDeleteConfirmOpen = true;
    }

    closeDeleteConfirm() {
        this.isDeleteConfirmOpen = false;
        this.deleteTargetId = null;
        this.deleteTargetType = null;
    }

    async handleDeleteConfirmed() {
        if (!this.deleteTargetId || !this.deleteTargetType) {
            return;
        }

        this.isLoading = true;
        try {
            if (this.deleteTargetType === 'entry') {
                await deletePriceBookEntry({ entryId: this.deleteTargetId });
                this.showToast('Success', 'Price Book Entry deleted.', 'success');
            } else {
                await deletePriceBook({ priceBookId: this.deleteTargetId });
                this.showToast('Success', 'Price book deleted successfully.', 'success');
            }

            this.closeDeleteConfirm();
            await this.refreshPriceBooksAndEntries();
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    openCloneModal() {
        this.cloneForm = {
            sourcePriceBookId: this.selectedEntryPriceBookId || '',
            targetPriceBookId: '',
            overwriteExisting: false
        };
        this.isCloneModalOpen = true;
    }

    closeCloneModal() {
        this.isCloneModalOpen = false;
        this.cloneForm = {
            sourcePriceBookId: '',
            targetPriceBookId: '',
            overwriteExisting: false
        };
    }

    handleCloneFormChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);
        this.cloneForm = {
            ...this.cloneForm,
            [fieldName]: value
        };
    }

    async handleCloneEntries() {
        if (!this.cloneForm.sourcePriceBookId || !this.cloneForm.targetPriceBookId) {
            this.showToast('Error', 'Source and target Price Books are required.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            const clonedCount = await clonePriceBookEntries({
                sourcePriceBookId: this.cloneForm.sourcePriceBookId,
                targetPriceBookId: this.cloneForm.targetPriceBookId,
                overwriteExisting: this.cloneForm.overwriteExisting
            });

            this.closeCloneModal();
            await this.refreshPriceBooksAndEntries();
            this.showToast('Success', `${clonedCount} entries copied successfully.`, 'success');
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    normalizeError(error) {
        if (error?.body?.message) {
            return error.body.message;
        }
        if (Array.isArray(error?.body)) {
            return error.body.map((item) => item.message).join(', ');
        }
        return error?.message || 'Unexpected error';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}