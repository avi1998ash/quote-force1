import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import GetProducts from '@salesforce/apex/ProductConfigureController.GetProducts';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';
import upsertPriceBook from '@salesforce/apex/ProductConfigureController.upsertPriceBook';
import deletePriceBook from '@salesforce/apex/ProductConfigureController.deletePriceBook';
import listPriceBookEntries from '@salesforce/apex/ProductConfigureController.listPriceBookEntries';
import upsertPriceBookEntry from '@salesforce/apex/ProductConfigureController.upsertPriceBookEntry';
import deletePriceBookEntry from '@salesforce/apex/ProductConfigureController.deletePriceBookEntry';
import isPriceBookEntryUsedInBundle from '@salesforce/apex/ProductConfigureController.isPriceBookEntryUsedInBundle';
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
    isEntryEditMode = false;
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
    isEntryProductDropdownOpen = false;
    entryProductSearchTerm = '';
    filteredEntryProductOptions = [];
    showEntryProductMoreLink = false;
    selectedEntryProductLabel = 'Select Product';
    isEntryPriceBookDropdownOpen = false;
    entryPriceBookSearchTerm = '';
    filteredEntryPriceBookOptions = [];
    showEntryPriceBookMoreLink = false;
    selectedEntryPriceBookLabel = 'All Price Books';
    isEntryFormProductDropdownOpen = false;
    entryFormProductSearchTerm = '';
    filteredEntryFormProductOptions = [];
    showEntryFormProductMoreLink = false;
    isEntryFormPriceBookDropdownOpen = false;
    entryFormPriceBookSearchTerm = '';
    filteredEntryFormPriceBookOptions = [];
    showEntryFormPriceBookMoreLink = false;
    selectedEntryFormPriceBookLabel = 'Select Price Book';
    isDeleteBlockedModalOpen = false;
    @track blockedEntryNames  = [];
    blockedEntryTotalCount = 0;
    isCloneSourceDropdownOpen = false;
    cloneSourceSearchTerm = '';
    filteredCloneSourceOptions = [];
    showCloneSourceMoreLink = false;
    selectedCloneSourceLabel = 'All Price Books';
    isCloneTargetDropdownOpen = false;
    cloneTargetSearchTerm = '';
    filteredCloneTargetOptions = [];
    showCloneTargetMoreLink = false;
    selectedCloneTargetLabel = 'All Price Books';
    boundHandleOutsideClick;
    isBlockedEntryExpanded = false;

    // ============================================================
    // PAGINATION (UI-only addition, requested this turn)
    // priceBookEntries keeps holding the FULL filtered list exactly as
    // before — every existing getter/handler that reads it (hasPriceBookEntries,
    // confirmDeletePriceBookEntry lookups, etc.) is untouched. Pagination
    // only slices that array for the <table> via paginatedPriceBookEntries.
    // Fixed page size of 20, matching "paginate only past 20 rows".
    // ============================================================
    @track entryCurrentPage = 1;
    entryPageSize = 20;

    currencyOptions = [
        { label: '($) USD', value: 'USD' },
        { label: '(Rs) INR', value: 'INR' },
        { label: '(EUR) EUR', value: 'EUR' },
        { label: '(GBP) GBP', value: 'GBP' }
    ];

    connectedCallback() {
        this.initialize();
        this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
        document.addEventListener('click', this.boundHandleOutsideClick);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.boundHandleOutsideClick);
    }

    handleOutsideClick(event) {
        console.log('[handleOutsideClick] Click event fired.');
        
        const target = event.target;
        console.log('[handleOutsideClick] Target element:', target);
        if (target) {
            console.log('[handleOutsideClick] Target classes:', target.className);
            console.log('[handleOutsideClick] Target isConnected:', target.isConnected);
        }

        // Check if the target is a "Show more" button or has been disconnected/removed from DOM
        const isShowMore = target && (
            !target.isConnected || 
            (target.classList && target.classList.contains('custom-combobox__show-more')) ||
            (target.className && typeof target.className === 'string' && target.className.includes('show-more')) ||
            (target.closest && target.closest('.custom-combobox__show-more'))
        );

        console.log('[handleOutsideClick] isShowMore check result:', isShowMore);

        if (isShowMore) {
            console.log('[handleOutsideClick] Target is disconnected or is show-more button. Ignoring outside click.');
            return;
        }

        if (this.isEntryProductDropdownOpen) {
            const productContainer = this.template.querySelector('.custom-combobox--product');
            const containsTarget = productContainer && productContainer.contains(target);
            console.log('[handleOutsideClick] Product Dropdown Open | containsTarget:', containsTarget);
            if (productContainer && !containsTarget) {
                console.log('[handleOutsideClick] Closing Product Dropdown');
                this.isEntryProductDropdownOpen = false;
            }
        }
        if (this.isEntryPriceBookDropdownOpen) {
            const priceBookContainer = this.template.querySelector('.custom-combobox--pricebook');
            const containsTarget = priceBookContainer && priceBookContainer.contains(target);
            console.log('[handleOutsideClick] Price Book Dropdown Open | containsTarget:', containsTarget);
            if (priceBookContainer && !containsTarget) {
                console.log('[handleOutsideClick] Closing Price Book Dropdown');
                this.isEntryPriceBookDropdownOpen = false;
            }
        }

        // Modal's Product dropdown
        if (this.isEntryFormProductDropdownOpen) {
            const formProductContainer = this.template.querySelector('.custom-combobox--form-product');
            const containsTarget = formProductContainer && formProductContainer.contains(target);
            console.log('[handleOutsideClick] Form Product Dropdown Open | containsTarget:', containsTarget);
            if (formProductContainer && !containsTarget) {
                console.log('[handleOutsideClick] Closing Form Product Dropdown');
                this.isEntryFormProductDropdownOpen = false;
            }
        }
        if (this.isCloneSourceDropdownOpen) {
            const cloneSourceContainer = this.template.querySelector('.custom-combobox--clone-source');
            const containsTarget = cloneSourceContainer && cloneSourceContainer.contains(target);
            console.log('[handleOutsideClick] Clone Source Dropdown Open | containsTarget:', containsTarget);
            if (cloneSourceContainer && !containsTarget) {
                console.log('[handleOutsideClick] Closing Clone Source Dropdown');
                this.isCloneSourceDropdownOpen = false;
            }
        }

        // Modal's Price Book dropdown
        if (this.isEntryFormPriceBookDropdownOpen) {
            const formPriceBookContainer = this.template.querySelector('.custom-combobox--form-pricebook');
            const containsTarget = formPriceBookContainer && formPriceBookContainer.contains(target);
            console.log('[handleOutsideClick] Form Price Book Dropdown Open | containsTarget:', containsTarget);
            if (formPriceBookContainer && !containsTarget) {
                console.log('[handleOutsideClick] Closing Form Price Book Dropdown');
                this.isEntryFormPriceBookDropdownOpen = false;
            }
        }

        // Clone Target dropdown
        if (this.isCloneTargetDropdownOpen) {
            const cloneTargetContainer = this.template.querySelector('.custom-combobox--clone-target');
            const containsTarget = cloneTargetContainer && cloneTargetContainer.contains(target);
            console.log('[handleOutsideClick] Clone Target Dropdown Open | containsTarget:', containsTarget);
            if (cloneTargetContainer && !containsTarget) {
                console.log('[handleOutsideClick] Closing Clone Target Dropdown');
                this.isCloneTargetDropdownOpen = false;
            }
        }
    }

    get entryFormPriceBookComboboxClass(){
        return this.isEntryFormPriceBookDropdownOpen 
            ? 'custom-combobox__control custom-combobox__control--open'
            : 'custom-combobox__control';
    }
    
    get hasFilteredEntryFormPriceBookOptions() {
        return this.filteredEntryFormPriceBookOptions && this.filteredEntryFormPriceBookOptions.length > 0;
    }

    get entryFormPriceBookShowMoreLabel() {
        return this.entryFormPriceBookSearchTerm
            ? `Show more results for "${this.entryFormPriceBookSearchTerm}"`
            : 'Show more results';
    }

    get isBookEditMode() {
        return !!this.bookForm.Id;
    }

    get entryProductComboboxClass(){
        return this.isEntryProductDropdownOpen
            ? 'custom-combobox__control custom-combobox__control--open'
            : 'custom-combobox__control';
    }
    
    get hasFilteredEntryProductOptions(){
        return this.filteredEntryProductOptions && this.filteredEntryProductOptions.length > 0 ;
    }

    get entryProductShowMoreLabel() {
        return this.entryProductSearchTerm
            ? `Show more results for "${this.entryProductSearchTerm}"`
            : 'Show more results';
    } 

    get priceBookModalTitle() {
        return this.bookForm.Id ? 'Edit Price Book' : 'Create Price Book';
    }

    get entryFormProductComboboxClass() {
        return this.isEntryFormProductDropdownOpen
            ? 'custom-combobox__control custom-combobox__control--open'
            : 'custom-combobox__control';
    }

    get hasFilteredEntryFormProductOptions() {
        return this.filteredEntryFormProductOptions && this.filteredEntryFormProductOptions.length > 0;
    }

    get entryFormProductShowMoreLabel() {
        return this.entryFormProductSearchTerm
            ? `Show more results for "${this.entryFormProductSearchTerm}"`
            : 'Show more results';
    }

    get selectedEntryFormProductLabel() {
        const selected = this.activeProductOptions.find(
            (option) => option.value === this.entryForm.QuoteForce__Product__c
        );
        return selected ? selected.label : 'Select Product';
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

    // ---------------- Entries pagination helpers ----------------

    get totalEntryPages() {
        const total = this.priceBookEntries ? this.priceBookEntries.length : 0;
        return Math.max(1, Math.ceil(total / this.entryPageSize));
    }

    get paginatedPriceBookEntries() {
        if (!this.priceBookEntries || this.priceBookEntries.length === 0) {
            return [];
        }
        if (this.entryCurrentPage > this.totalEntryPages) {
            this.entryCurrentPage = this.totalEntryPages;
        }
        const start = (this.entryCurrentPage - 1) * this.entryPageSize;
        return this.priceBookEntries.slice(start, start + this.entryPageSize);
    }

    get showEntryPagination() {
        return (this.priceBookEntries || []).length > this.entryPageSize;
    }

    get isEntryFirstPage() {
        return this.entryCurrentPage <= 1;
    }

    get isEntryLastPage() {
        return this.entryCurrentPage >= this.totalEntryPages;
    }

    get entryPageNumbers() {
        return Array.from({ length: this.totalEntryPages }, (_, i) => {
            const pageValue = i + 1;
            const isActive = pageValue === this.entryCurrentPage;
            return {
                value: pageValue,
                label: `${pageValue}`,
                className: isActive ? 'entry-page-btn entry-page-btn--active' : 'entry-page-btn'
            };
        });
    }
    get entryTableCounterStyle() {
        const start = (this.entryCurrentPage - 1) * this.entryPageSize;
        return `counter-reset: sr-number ${start};`;
    }
    get entryPaginationSummary() {
        const total = this.priceBookEntries ? this.priceBookEntries.length : 0;
        if (total === 0) {
            return 'Showing 0 entries';
        }
        const start = (this.entryCurrentPage - 1) * this.entryPageSize + 1;
        const end = Math.min(this.entryCurrentPage * this.entryPageSize, total);
        return `Showing ${start} to ${end} of ${total} entries`;
    }

    handlePrevEntryPage() {
        if (this.entryCurrentPage > 1) {
            this.entryCurrentPage = this.entryCurrentPage - 1;
        }
    }

    handleNextEntryPage() {
        if (this.entryCurrentPage < this.totalEntryPages) {
            this.entryCurrentPage = this.entryCurrentPage + 1;
        }
    }

    handleGoToEntryPage(event) {
        const page = Number(event.currentTarget.dataset.page);
        if (page >= 1 && page <= this.totalEntryPages) {
            this.entryCurrentPage = page;
        }
    }

    // --------------------------------------------------------------

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

    get entryPriceBookComboboxClass() {
        return this.isEntryPriceBookDropdownOpen
            ? 'custom-combobox__control custom-combobox__control--open'
            : 'custom-combobox__control';
    }

    get hasFilteredEntryPriceBookOptions() {
        return this.filteredEntryPriceBookOptions && this.filteredEntryPriceBookOptions.length > 0;
    }

    get entryPriceBookShowMoreLabel() {
        return this.entryPriceBookSearchTerm
            ? `Show more results for "${this.entryPriceBookSearchTerm}"`
            : 'Show more results';
    }

    get isAnyEntryDropdownOpen() {
        return this.isEntryProductDropdownOpen || this.isEntryPriceBookDropdownOpen;
    }

    get cloneSourceComboboxClass() {
        return this.isCloneSourceDropdownOpen
            ? 'custom-combobox__control custom-combobox__control--open'
            : 'custom-combobox__control';
    }

    get hasFilteredCloneSourceOptions() {
        return this.filteredCloneSourceOptions && this.filteredCloneSourceOptions.length > 0;
    }

    get cloneSourceShowMoreLabel() {
        return this.cloneSourceSearchTerm
            ? `Show more results for "${this.cloneSourceSearchTerm}"`
            : 'Show more results';
    }

    get cloneTargetComboboxClass() {
        return this.isCloneTargetDropdownOpen
            ? 'custom-combobox__control custom-combobox__control--open'
            : 'custom-combobox__control';
    }

    get hasFilteredCloneTargetOptions() {
        return this.filteredCloneTargetOptions && this.filteredCloneTargetOptions.length > 0;
    }

    get cloneTargetShowMoreLabel() {
        return this.cloneTargetSearchTerm
            ? `Show more results for "${this.cloneTargetSearchTerm}"`
            : 'Show more results';
    }

    get activeProductOptions() {
        return (this.productOptions || []).filter(
            (option) => option.value === '' ? false : option.isActive !== false
        );
    }
     get isDeleteBlockedTitle() {
        return this.deleteTargetType === 'entry'
            ? 'Cannot Delete Price Book Entry'
            : 'Cannot Delete Price Book';
    }

    get isDeleteBlockedMessage() {
        if (this.deleteTargetType === 'entry') {
            return 'You cannot delete this Price Book Entry because it is used in a Product Bundle. Please remove it from the bundle first.';
        }

        const entryWord = this.blockedEntryTotalCount === 1 ? 'Price Book Entry' : 'Price Book Entries';
        const namesToShow = this.isBlockedEntryExpanded
            ? this.blockedEntryNames
            : this.blockedEntryNames.slice(0, 5);
        const names = namesToShow.join(', ');

        if (this.blockedEntryTotalCount === 1) {
            return `This Price Book is linked to 1 ${entryWord}: ${names}`;
        }
        return `This Price Book is linked to ${this.blockedEntryTotalCount} ${entryWord}, including: ${names}`;
    }

    get isDeleteBlockedShowMoreLink() {
        return this.deleteTargetType === 'book'
            && !this.isBlockedEntryExpanded
            && this.blockedEntryTotalCount > 5;
    }

    get deleteBlockedMoreCount() {
        return this.blockedEntryTotalCount - 5;
    }

    handleShowAllBlockedEntries(event) {
        if (event) {
            event.stopPropagation();
        }
        this.isBlockedEntryExpanded = true;
    }

    closeAllEntryDropdowns() {
        this.isEntryProductDropdownOpen = false;
        this.isEntryPriceBookDropdownOpen = false;
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
            { label: 'All Products', value: '' },   
            ...(result || []).map((product) => ({
                label: product.QuoteForce__Product_Code__c
                    ? `${product.Name} (${product.QuoteForce__Product_Code__c})`
                    : product.Name,
                value: product.Id,
                productCode: product.QuoteForce__Product_Code__c,
                currencyCode: product.QuoteForce__Currency__c,
                isActive: product.QuoteForce__Active__c
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
            activeLabel: entry.QuoteForce__Is_Active__c ? 'Yes' : 'No',
            // Display-only addition alongside activeLabel (not a replacement) —
            // purely for the colored YES/NO pill in the redesigned table.
            activeBadgeClass: entry.QuoteForce__Is_Active__c
                ? 'active-pill active-pill--yes'
                : 'active-pill active-pill--no'
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
        this.entryCurrentPage = 1;
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

        this.entryCurrentPage = 1;
        this.loadPriceBookEntries().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    openEntryProductDropdown(event) {
        this.isEntryPriceBookDropdownOpen = false;
        event.stopPropagation();
        this.isEntryProductDropdownOpen = !this.isEntryProductDropdownOpen;
        if (this.isEntryProductDropdownOpen) {
            this.filterEntryProductOptions(this.entryProductSearchTerm);
        }
    }

    handleEntryProductSearch(event) {
        this.entryProductSearchTerm = event.target.value;
        this.filterEntryProductOptions(this.entryProductSearchTerm);
    }

    filterEntryProductOptions(searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matched = (this.productOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryProductMoreLink = matched.length > 5;
        this.filteredEntryProductOptions = this.showEntryProductMoreLink ? matched.slice(0, 5) : matched;
    }

    handleEntryProductOptionSelect(event) {
        const value = event.currentTarget.dataset.value;
        const selected = (this.productOptions || []).find((opt) => opt.value === value);

        this.selectedEntryProductId = value;
        this.selectedEntryProductLabel = selected ? selected.label : 'Select Product';
        this.isEntryProductDropdownOpen = false;
        this.entryCurrentPage = 1;

        this.loadPriceBookEntries().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    handleEntryProductShowMore(event) {
        console.log('[handleEntryProductShowMore] Called.');
        if (event) {
            event.stopPropagation();
        }
        const term = (this.entryProductSearchTerm || '').toLowerCase();
        this.filteredEntryProductOptions = (this.productOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryProductMoreLink = false; 
        console.log('[handleEntryProductShowMore] Expanded list options count:', this.filteredEntryProductOptions.length);
    }

    handleDropdownContainerClick(event) {
        event.stopPropagation();
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

    handleBookFormChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);
        this.bookForm = {
            ...this.bookForm,
            [fieldName]: value
        };
    }

    async savePriceBook() {
        const trimmedName = this.bookForm.Name?.trim();

        if (!trimmedName) {
            this.showToast('Error', 'Price Book name is required.', 'error');
            return;
        }

        const nameAlreadyExists = (this.priceBooks || []).some(
            (pb) => pb.Id !== this.bookForm.Id &&
                    pb.Name?.toLowerCase() === trimmedName.toLowerCase()
        );
        if (nameAlreadyExists) {
            this.showToast('Error', 'A PriceBook with this name already exists.', 'error');
            return;
        }

        const lowerName = trimmedName.toLowerCase();
        const matchedCurrency = this.currencyOptions
            .map((option) => option.value)
            .filter((code) => code)
            .find((code) => lowerName.includes(code.toLowerCase()));

        if (matchedCurrency) {
            this.showToast(
                'Error',
                `PriceBook name cannot contain the currency code "${matchedCurrency}".`,
                'error'
            );
            return;
        }

        this.isLoading = true;
        try {
            await upsertPriceBook({
                priceBookRecord: {
                    Id: this.bookForm.Id,
                    Name: trimmedName,
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

    async confirmDeletePriceBook(event) {
        const recordId = event.currentTarget.dataset.id;

        this.isLoading = true;
        try {
            const existingEntries = await listPriceBookEntries({
                searchKey: '',
                priceBookId: recordId,
                productId: null,
                currencyFilter: '',
                activeOnly: false
            });

            if (existingEntries && existingEntries.length > 0) {
                this.blockedEntryNames = existingEntries.map(
                    (entry) => entry.QuoteForce__Product__r?.Name || 'Unknown Product'
                );
                this.blockedEntryTotalCount = existingEntries.length;
                this.isBlockedEntryExpanded = false;
                this.deleteTargetId = recordId;
                this.isDeleteBlockedModalOpen = true;
                this.deleteTargetType = 'book';
                return;
            }

            this.deleteTargetId = recordId;
            this.deleteTargetType = 'book';
            this.isDeleteConfirmOpen = true;
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async openNewPriceBookEntryModal() {
        try {
            await this.loadProducts();
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        }

        this.entryForm = {
            ...EMPTY_ENTRY_FORM,
            QuoteForce__Price_Book__c: this.selectedEntryPriceBookId || ''
        };

        const selectedPriceBook = this.priceBookOptions.find(
            (option) => option.value === this.entryForm.QuoteForce__Price_Book__c
        );
        if (selectedPriceBook?.currencyCode) {
            this.entryForm.QuoteForce__Currency__c = selectedPriceBook.currencyCode;
            this.isCurrencyDisabled = true; 
        } else {
            this.isCurrencyDisabled = false;
        }
        this.isEntryEditMode = false;
        this.selectedEntryFormPriceBookLabel = selectedPriceBook ? selectedPriceBook.label : 'Select Price Book';
        this.isEntryFormProductDropdownOpen = false;
        this.entryFormProductSearchTerm = '';
        this.isPriceBookEntryModalOpen = true;
    }

    async openEditPriceBookEntryModal(event) {
        const recordId = event.currentTarget.dataset.id;
        const selectedRecord = this.priceBookEntries.find((entry) => entry.Id === recordId);
        if (!selectedRecord) {
            return;
        }

        try {
            await this.loadProducts();
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        }

        this.entryForm = {
            Id: selectedRecord.Id,
            QuoteForce__Price_Book__c: selectedRecord.QuoteForce__Price_Book__c,
            QuoteForce__Product__c: selectedRecord.QuoteForce__Product__c,
            QuoteForce__Unit_Price__c: selectedRecord.QuoteForce__Unit_Price__c,
            QuoteForce__Currency__c: selectedRecord.QuoteForce__Currency__c || '',
            QuoteForce__Is_Active__c: selectedRecord.QuoteForce__Is_Active__c
        };

        const matchedPriceBook = this.priceBookOptions.find(
            (option) => option.value === selectedRecord.QuoteForce__Price_Book__c
        );
        this.selectedEntryFormPriceBookLabel = matchedPriceBook ? matchedPriceBook.label : 'Select Price Book';

        this.isCurrencyDisabled = !!selectedRecord.QuoteForce__Price_Book__c;
        this.isEntryEditMode = true;
        this.isEntryFormProductDropdownOpen = false;
        this.entryFormProductSearchTerm = '';
        this.isEntryFormPriceBookDropdownOpen = false;
        this.entryFormPriceBookSearchTerm = '';
        this.isPriceBookEntryModalOpen = true;
    }

    closePriceBookEntryModal() {
        this.isPriceBookEntryModalOpen = false;
        this.entryForm = { ...EMPTY_ENTRY_FORM };
        this.isCurrencyDisabled = false;
        this.isEntryEditMode = false;
        this.isEntryFormProductDropdownOpen = false;
        this.entryFormProductSearchTerm = '';
        this.isEntryFormPriceBookDropdownOpen = false;
        this.entryFormPriceBookSearchTerm = '';
        this.selectedEntryFormPriceBookLabel = 'Select Price Book';
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
                this.isCurrencyDisabled = true;   
            } else {
                this.entryForm = {
                    ...this.entryForm,
                    QuoteForce__Price_Book__c: value,
                    QuoteForce__Currency__c: ''
                };
                this.isCurrencyDisabled = false; 
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

            this.dispatchEvent(new CustomEvent('entrysaved', {
                detail: { productId: this.entryForm.QuoteForce__Product__c },
                bubbles: true,
                composed: true
            }));

            this.closePriceBookEntryModal();
            await this.refreshPriceBooksAndEntries();
            this.showToast('Success', 'Price Book Entry saved successfully.', 'success');
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    async confirmDeletePriceBookEntry(event) {
        const entryId = event.currentTarget.dataset.id;

        this.isLoading = true;
        try {
            const isUsed = await isPriceBookEntryUsedInBundle({ priceBookEntryId: entryId });

            if (isUsed) {
                this.isDeleteBlockedModalOpen = true;
                this.deleteTargetType = 'entry';
                return;
            }

            this.deleteTargetId = entryId;
            this.deleteTargetType = 'entry';
            this.isDeleteConfirmOpen = true;
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    closeDeleteConfirm() {
        this.isDeleteConfirmOpen = false;
        this.deleteTargetId = null;
        this.deleteTargetType = null;
    }

    closeDeleteBlockedModal() {
        this.isDeleteBlockedModalOpen = false;
        this.blockedEntryNames = [];
        this.blockedEntryTotalCount = 0;
        this.isBlockedEntryExpanded = false;
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

        const preselectedSource = this.priceBookOptions.find(
            (option) => option.value === this.cloneForm.sourcePriceBookId
        );
        this.selectedCloneSourceLabel = preselectedSource ? preselectedSource.label : 'All Price Books';
        this.selectedCloneTargetLabel = 'All Price Books';
        this.isCloneSourceDropdownOpen = false;
        this.isCloneTargetDropdownOpen = false;
        this.cloneSourceSearchTerm = '';
        this.cloneTargetSearchTerm = '';

        this.isCloneModalOpen = true;
    }

    closeCloneModal() {
        this.isCloneModalOpen = false;
        this.cloneForm = {
            sourcePriceBookId: '',
            targetPriceBookId: '',
            overwriteExisting: false
        };
        this.selectedCloneSourceLabel = 'All Price Books';
        this.selectedCloneTargetLabel = 'All Price Books';
        this.isCloneSourceDropdownOpen = false;
        this.isCloneTargetDropdownOpen = false;
        this.cloneSourceSearchTerm = '';
        this.cloneTargetSearchTerm = '';
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

    openEntryPriceBookDropdown(event) {
        this.isEntryProductDropdownOpen = false;
        event.stopPropagation();
        this.isEntryPriceBookDropdownOpen = !this.isEntryPriceBookDropdownOpen;
        if (this.isEntryPriceBookDropdownOpen) {
            this.filterEntryPriceBookOptions(this.entryPriceBookSearchTerm);
        }
    }

    handleEntryPriceBookSearch(event) {
        this.entryPriceBookSearchTerm = event.target.value;
        this.filterEntryPriceBookOptions(this.entryPriceBookSearchTerm);
    }

    filterEntryPriceBookOptions(searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matched = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryPriceBookMoreLink = matched.length > 5;
        this.filteredEntryPriceBookOptions = this.showEntryPriceBookMoreLink ? matched.slice(0, 5) : matched;
    }

    handleEntryPriceBookOptionSelect(event) {
        const value = event.currentTarget.dataset.value;
        const selected = (this.priceBookOptions || []).find((opt) => opt.value === value);

        this.selectedEntryPriceBookId = value;
        this.selectedEntryPriceBookLabel = selected ? selected.label : 'All Price Books';
        this.isEntryPriceBookDropdownOpen = false;
        this.entryCurrentPage = 1;

        this.loadPriceBookEntries().catch((error) => {
            this.showToast('Error', this.normalizeError(error), 'error');
        });
    }

    handleEntryPriceBookShowMore(event) {
        console.log('[handleEntryPriceBookShowMore] Called.');
        if (event) {
            event.stopPropagation();
        }
        const term = (this.entryPriceBookSearchTerm || '').toLowerCase();
        this.filteredEntryPriceBookOptions = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryPriceBookMoreLink = false;
        console.log('[handleEntryPriceBookShowMore] Expanded list options count:', this.filteredEntryPriceBookOptions.length);
    }

    openEntryFormProductDropdown(event) {
        this.isEntryFormPriceBookDropdownOpen = false;
        event.stopPropagation();
        this.isEntryFormProductDropdownOpen = !this.isEntryFormProductDropdownOpen;
        if (this.isEntryFormProductDropdownOpen) {
            this.filterEntryFormProductOptions(this.entryFormProductSearchTerm);
        }
    }

    openEntryFormPriceBookDropdown(event) {
        event.stopPropagation();
        this.isEntryFormProductDropdownOpen = false;
        this.isEntryFormPriceBookDropdownOpen = !this.isEntryFormPriceBookDropdownOpen;
        if (this.isEntryFormPriceBookDropdownOpen) {
            this.filterEntryFormPriceBookOptions(this.entryFormPriceBookSearchTerm);
        }
    }

    handleEntryFormProductSearch(event) {
        this.entryFormProductSearchTerm = event.target.value;
        this.filterEntryFormProductOptions(this.entryFormProductSearchTerm);
    }

    filterEntryFormProductOptions(searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matched = (this.activeProductOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryFormProductMoreLink = matched.length > 5;
        this.filteredEntryFormProductOptions = this.showEntryFormProductMoreLink ? matched.slice(0, 5) : matched;
    }

    handleEntryFormProductOptionSelect(event) {
        const value = event.currentTarget.dataset.value;
        this.isEntryFormProductDropdownOpen = false;
        this.entryFormProductSearchTerm = '';

        this.handleEntryFormChange({
            target: {
                dataset: { field: 'QuoteForce__Product__c' },
                type: 'text',
                value
            },
            detail: { value }
        });
    }

    handleEntryFormProductShowMore() {
        console.log('[handleEntryFormProductShowMore] Called.');
        const term = (this.entryFormProductSearchTerm || '').toLowerCase();
        this.filteredEntryFormProductOptions = (this.activeProductOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryFormProductMoreLink = false;
        console.log('[handleEntryFormProductShowMore] Expanded list options count:', this.filteredEntryFormProductOptions.length);
    }

    handleEntryFormPriceBookSearch(event) {
        this.entryFormPriceBookSearchTerm = event.target.value;
        this.filterEntryFormPriceBookOptions(this.entryFormPriceBookSearchTerm);
    }

    filterEntryFormPriceBookOptions(searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matched = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryFormPriceBookMoreLink = matched.length > 5;
        this.filteredEntryFormPriceBookOptions = this.showEntryFormPriceBookMoreLink ? matched.slice(0, 5) : matched;
    }

    handleEntryFormPriceBookOptionSelect(event) {
        const value = event.currentTarget.dataset.value;
        const selected = (this.priceBookOptions || []).find((opt) => opt.value === value);

        this.selectedEntryFormPriceBookLabel = selected ? selected.label : 'Select Price Book';
        this.isEntryFormPriceBookDropdownOpen = false;
        this.entryFormPriceBookSearchTerm = '';

        this.handleEntryFormChange({
            target: {
                dataset: { field: 'QuoteForce__Price_Book__c' },
                type: 'text',
                value
            },
            detail: { value }
        });
    }

    handleEntryFormPriceBookShowMore() {
        console.log('[handleEntryFormPriceBookShowMore] Called.');
        const term = (this.entryFormPriceBookSearchTerm || '').toLowerCase();
        this.filteredEntryFormPriceBookOptions = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showEntryFormPriceBookMoreLink = false;
        console.log('[handleEntryFormPriceBookShowMore] Expanded list options count:', this.filteredEntryFormPriceBookOptions.length);
    }

    openCloneSourceDropdown(event) {
        event.stopPropagation();
        this.isCloneTargetDropdownOpen = false;
        this.isCloneSourceDropdownOpen = !this.isCloneSourceDropdownOpen;
        if (this.isCloneSourceDropdownOpen) {
            this.filterCloneSourceOptions(this.cloneSourceSearchTerm);
        }
    }

    handleCloneSourceSearch(event) {
        this.cloneSourceSearchTerm = event.target.value;
        this.filterCloneSourceOptions(this.cloneSourceSearchTerm);
    }

    filterCloneSourceOptions(searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matched = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showCloneSourceMoreLink = matched.length > 5;
        this.filteredCloneSourceOptions = this.showCloneSourceMoreLink ? matched.slice(0, 5) : matched;
    }

    handleCloneSourceOptionSelect(event) {
        const value = event.currentTarget.dataset.value;
        const selected = (this.priceBookOptions || []).find((opt) => opt.value === value);

        this.selectedCloneSourceLabel = selected ? selected.label : 'All Price Books';
        this.isCloneSourceDropdownOpen = false;
        this.cloneSourceSearchTerm = '';

        this.cloneForm = {
            ...this.cloneForm,
            sourcePriceBookId: value
        };
    }

    handleCloneSourceShowMore() {
        console.log('[handleCloneSourceShowMore] Called.');
        const term = (this.cloneSourceSearchTerm || '').toLowerCase();
        this.filteredCloneSourceOptions = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showCloneSourceMoreLink = false;
        console.log('[handleCloneSourceShowMore] Expanded list options count:', this.filteredCloneSourceOptions.length);
    }

    openCloneTargetDropdown(event) {
        event.stopPropagation();
        this.isCloneSourceDropdownOpen = false;
        this.isCloneTargetDropdownOpen = !this.isCloneTargetDropdownOpen;
        if (this.isCloneTargetDropdownOpen) {
            this.filterCloneTargetOptions(this.cloneTargetSearchTerm);
        }
    }

    handleCloneTargetSearch(event) {
        this.cloneTargetSearchTerm = event.target.value;
        this.filterCloneTargetOptions(this.cloneTargetSearchTerm);
    }

    filterCloneTargetOptions(searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matched = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showCloneTargetMoreLink = matched.length > 5;
        this.filteredCloneTargetOptions = this.showCloneTargetMoreLink ? matched.slice(0, 5) : matched;
    }

    handleCloneTargetOptionSelect(event) {
        const value = event.currentTarget.dataset.value;
        const selected = (this.priceBookOptions || []).find((opt) => opt.value === value);

        this.selectedCloneTargetLabel = selected ? selected.label : 'All Price Books';
        this.isCloneTargetDropdownOpen = false;
        this.cloneTargetSearchTerm = '';

        this.cloneForm = {
            ...this.cloneForm,
            targetPriceBookId: value
        };
    }

    handleCloneTargetShowMore() {
        console.log('[handleCloneTargetShowMore] Called.');
        const term = (this.cloneTargetSearchTerm || '').toLowerCase();
        this.filteredCloneTargetOptions = (this.priceBookOptions || []).filter((opt) =>
            opt.label.toLowerCase().includes(term)
        );
        this.showCloneTargetMoreLink = false;
        console.log('[handleCloneTargetShowMore] Expanded list options count:', this.filteredCloneTargetOptions.length);
    }
}