import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadStyle } from 'lightning/platformResourceLoader';
import customStyle from '@salesforce/resourceUrl/customStyle';
import insertProduct from '@salesforce/apex/ProductConfigureController.insertProduct';
import getAdminConfig from '@salesforce/apex/AdminSettingController.getAdminConfig';
import updatePriceBookEntriesPrice from '@salesforce/apex/ProductConfigureController.updatePriceBookEntriesPrice';
import upsertPriceBook from '@salesforce/apex/ProductConfigureController.upsertPriceBook';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';
import createProductWithPricing from '@salesforce/apex/ProductConfigureController.createProductWithPricing';
import getPriceBookEntriesByProduct from '@salesforce/apex/ProductConfigureController.getPriceBookEntriesByProduct';
import getPriceBookEntriesByPriceBook from '@salesforce/apex/ProductConfigureController.getPriceBookEntriesByPriceBook';
import updateProductWithPricing from '@salesforce/apex/ProductConfigureController.updateProductWithPricing';
import uploadFile from '@salesforce/apex/ProductConfigureController.uploadFile';
import uploadFileToProduct from '@salesforce/apex/ProductConfigureController.uploadFileToProduct';
import deleteFile from '@salesforce/apex/ProductConfigureController.deleteFile';
import insertProductBundle from '@salesforce/apex/ProductConfigureController.insertProductBundle';
import updateProductBundle from '@salesforce/apex/ProductConfigureController.updateProductBundle';
import updateProduct from '@salesforce/apex/ProductConfigureController.updateProduct';
import updateProductLineItems from '@salesforce/apex/ProductConfigureController.updateProductLineItems';
import deleteProduct from '@salesforce/apex/ProductConfigureController.deleteProduct';
import deleteProductBundle from '@salesforce/apex/ProductConfigureController.deleteProductBundle';
import deleteProductLineItems from '@salesforce/apex/ProductConfigureController.deleteProductLineItems';
import GetProducts from '@salesforce/apex/ProductConfigureController.GetProducts';
import GetProductsBundle from '@salesforce/apex/ProductConfigureController.GetProductsBundle';
import insertProductLineItm from '@salesforce/apex/ProductConfigureController.insertProductLineItm';
import insertProductLineItmSingle from '@salesforce/apex/ProductConfigureController.insertProductLineItmSingle';
import GetProductLineItm from '@salesforce/apex/ProductConfigureController.GetProductLineItm';
import hasChildRecords from '@salesforce/apex/ProductConfigureController.hasChildRecords';

const NEW_PRICEBOOK_OPTION = '__new__';

const EMPTY_NEW_PRICEBOOK_FORM = {
    Name: '',
    QuoteForce__Currency__c: 'USD',
    QuoteForce__Description__c: '',
    QuoteForce__Is_Active__c: true,
    QuoteForce__Is_Default__c: false
};

function createDraftPriceBook(currencyCode = 'USD') {
    return {
        Name: '',
        description: '',
        currencyCode,
        isActive: true,
        isDefault: false
    };
}
 
function createPricingRow(sequence, currencyCode = 'USD') {
    return {
        id: `pricing-row-${sequence}`,
        entryId: null,
        priceBookSelection: '',
        priceBookId: '',
        priceBookSearchTerm: '',
        filteredPriceBookOptions: [],
        hasFilteredPriceBookOptions: true,
        isPriceBookDropdownOpen: false,
        selectedPriceBookLabel: 'Select Pricebook',
        unitPrice: null,
        currency: currencyCode,
        isActive: true,
        isNewPriceBook: false,
        isLocked: false,
        draftPriceBook: createDraftPriceBook(currencyCode)
    };
}

function createBundleItemRow(idValue = '') {
    return {
        Id: idValue,
        Quantity: 0,
        Price: 0.00,
        LineTotal: 0,
        productBundle: '',
        productId: '',
        priceBookEntryId: '',
        priceBookEntryLabel: 'Select Price Book Entry',
        entrySearchTerm: '',
        filteredEntryOptions: [],
        hasFilteredEntryOptions: false,
        isEntryDropdownOpen: false,
        openAbove: false,
        dropdownClass: 'custom-combobox__dropdown'
    };
}

function buildProductImageUrl(contentVersionId) {
    return contentVersionId
        ? `/sfc/servlet.shepherd/version/download/${contentVersionId}`
        : '';
}

function normalizeCurrencyCode(currencyCode) {
    return (currencyCode || '').trim().toUpperCase();
}

export default class ProductConfigureCmp extends LightningElement {

    get filter(){
        let criteria = [
            {
                fieldPath: 'QuoteForce__Active__c',
                operator: 'eq',
                value: true
            }
        ];

        if(this.bundleCurrency){
            criteria.push({
                fieldPath: 'QuoteForce__Currency__c',
                operator: 'eq',
                value: this.bundleCurrency
            });
        }

        return { criteria };
    }
    get existingBundleCurrencySymbol() {
        const code = normalizeCurrencyCode(this.bundleCurrency);
        return this.currencySymbols[code] || '';
    }

    get existingBundleCurrencyCode() {
        return normalizeCurrencyCode(this.bundleCurrency);
    }

    get isBundleEntryPickerDisabled() {
        return !this.bundlePriceBookId;
    }

    get modalTitle() {
        return this.productDelete ? 'Delete Product' : 'Clear Product';
    }

    get existingBundlePriceBookName() {
        return this.existingBundlePriceBookSearchTerm || 'No Pricebook Selected';
    }

    get modalMessage() {
        if (this.productDelete) {
            return this.hasPriceBookEntriesWarning
                ? 'Are you sure you want to delete this product? Deleting this product will also delete all its associated Price Book Entries.'
                : 'Are you sure you want to delete this product?';
        }
        return 'Are you sure you want to reset all values?';
    }

    get modalButtonLabel() {
        return this.productDelete ? 'Delete' : 'Create';
    }

    get notDeleteMessage() {
        if (this.blockedByBundle) {
            return 'You cannot delete this Product because it is used in a Product Bundle. Please remove it from the bundle first.';
        }
        return 'You cannot delete this Product because it has related records linked to it.';
    }

    handleConfirm() {
        if (this.productDelete) {
            this.handleClickDelete();
        } else {
            this.handleClickClear();
        }
    }

    @track NewProdBool = false;
    @track editProdBool = false;
    @track prodName = '';
    @track unitOfMeas = '';
    @track isactive = false;
    @track productRecords;
    @track productBundleRecords;
    @track searchVal = '';
    @track searchValBundle = '';
    @track productNameValue = '';
    @track hasPriceBookEntriesWarning = false;
    @track ProductCodeValue = '';
    @track productDescriptionValue = '';
    @track UOMValue = '';
    @track productUPCValue = '';
    @track productDQValue = 1;
    @track productActionId = '';
    @track bundleNameValue = '';
    @track bundleDescription = '';
    @track bundleDescriptionValue = '';
    @track bundlePriceBookSearchTerm = '';
    @track existingBundlePriceBookSearchTerm = '';
    @track productClear = false;
    @track productDelete = false;
    @track isShowModal = false;
    @track productBundle = false;
    @track productItems = [];
    @track productId = '';
    @track fileData;
    @track previewUrl;
    @track imageAvailable = false;
    @track productImageUrl;
    @track selectedProdId = '';
    @track imageUploaded = false;
    @track showMessage = false;
    @track showMessageProducts = false;
    @track priceBookOptions = [];
    @track pricingRows = [];
    @track currentProductModalStep = 'basic';
    loaded = false;
    pricingRowSequence = 0;
    @track isShowRemovePricingRowModal = false;
    _pendingRemoveRowId = null;
    @track isNewPriceBookPopupOpen = false;
    @track newPriceBookForm = { ...EMPTY_NEW_PRICEBOOK_FORM };
    activePricingRowId = null;
    @track blockedByBundle = false;
    @track isShowModalNotDelete = false;
    @track bundleCurrency = '';
    @track bundlePriceBookId = '';
    @track currencyLocked = false;
    @track bundleCurrencyFilter = '';
    @track deleteProductBundleModal = false;
    @track isShowExistingItemDeleteModal = false;
    @track existingItemDeleteIndex = null;
    @track bundlePriceBookFilter = '';
    @track isShow = true;
    @track selectedProdBundleId = '';
	@track isImportProductsModalOpen = false;
    @track isImportProductsBundleModalOpen = false;
	@track currencyFilter = '';
    @track productItemList = [createBundleItemRow('')];
    @track productItemListInsert = [createBundleItemRow(1)];
    @track bundleEntryOptions = [];
    @track isBundlePriceBookDropdownOpen = false;
    @track isExistingBundlePriceBookDropdownOpen = false;
    @track isShowBundleItemDeleteModal = false;
    @track bundleItemDeleteIndex = null;
    @track isShowImageDeleteModal = false;
	@track selectedCurrency = 'USD';
    @track orgDefaultCurrency = '';
    documentClickHandler;

    // ============================================================
    // MAIN TAB BAR (UI-only replacement for <lightning-tabset>)
    // lightning-tabset is a Salesforce base component with its own
    // internal shadow DOM — CSS here cannot reach its nav bar to make
    // it the floating overlapping card the design calls for. This is
    // a plain, self-contained tab bar with identical tab labels and
    // identical tab content (Products / Price Books / Price Book
    // Entries / Bundles); no Apex calls or other logic are affected —
    // switching tabs never triggered any side effects before, and it
    // still doesn't now.
    // ============================================================
    @track activeMainTab = 'products';

    get isProductsMainTabActive() {
        return this.activeMainTab === 'products';
    }
    get isPriceBooksMainTabActive() {
        return this.activeMainTab === 'priceBooks';
    }
    get isPriceBookEntriesMainTabActive() {
        return this.activeMainTab === 'priceBookEntries';
    }
    get isBundlesMainTabActive() {
        return this.activeMainTab === 'bundles';
    }

    get productsMainTabClass() {
        return this.getMainTabClass('products');
    }
    get priceBooksMainTabClass() {
        return this.getMainTabClass('priceBooks');
    }
    get priceBookEntriesMainTabClass() {
        return this.getMainTabClass('priceBookEntries');
    }
    get bundlesMainTabClass() {
        return this.getMainTabClass('bundles');
    }

    getMainTabClass(tab) {
        return `qf-tabbar-item${this.activeMainTab === tab ? ' qf-tabbar-item--active' : ''}`;
    }

    handleMainTabClick(event) {
        this.activeMainTab = event.currentTarget.dataset.tab;
    }

    // ============================================================
    // PAGINATION (UI-only addition — see notes below)
    // Products keep loading exactly as before via getProductRecord()/
    // GetProducts(). productRecords still holds the FULL filtered
    // list returned by Apex. Pagination only slices that array for
    // rendering via the paginatedProductRecords getter; nothing about
    // search, currency filtering, or CRUD calls is changed.
    // ============================================================
    @track currentPage = 1;
    @track pageSize = 8;
    _resizeHandler;

    get isSingleInsertRow() {
        return this.productItemListInsert.length <= 1;
    }

    handleBundleItemDeleteConfirm(event) {
        this.bundleItemDeleteIndex = Number(event.currentTarget.dataset.index);
        this.isShowBundleItemDeleteModal = true;
    }

    hideBundleItemDeleteModal() {
        this.isShowBundleItemDeleteModal = false;
        this.bundleItemDeleteIndex = null;
    }

    handleBundleItemDeleteConfirmed() {
        this.isShowBundleItemDeleteModal = false;
        this.deleteItemInsertByIndex(this.bundleItemDeleteIndex);
        this.bundleItemDeleteIndex = null;
    }

    deleteItemInsertByIndex(rowIndex) {
        if (this.productItemListInsert.length > 1) {
            this.productItemListInsert = this.productItemListInsert.filter((_, i) => i !== rowIndex);
            this.updateCurrencyLock();
        }
    }

    handleExistingItemDeleteConfirm(event) {
        this.existingItemDeleteIndex = Number(event.currentTarget.dataset.index);
        this.isShowExistingItemDeleteModal = true;
    }

    hideExistingItemDeleteModal() {
        this.isShowExistingItemDeleteModal = false;
        this.existingItemDeleteIndex = null;
    }

    async handleExistingItemDeleteConfirmed() {
        this.isShowExistingItemDeleteModal = false;
        const rowIndex = this.existingItemDeleteIndex;
        this.existingItemDeleteIndex = null;

        try {
            if (this.productItemList.length > 1) {
                let productLineItemId = this.productItemList[rowIndex]?.Id;

                if (!productLineItemId) {
                    this.productItemList = this.productItemList.filter((_, i) => i !== rowIndex);
                    this.showToast('Success', 'Item removed from bundle.', 'success');
                    return;
                }

                const result = await deleteProductLineItems({ Id: productLineItemId });
                if (result) {
                    this.productItemList = this.productItemList.filter((_, i) => i !== rowIndex);
                    this.showToast('Success', 'Item deleted from bundle.', 'success');
                }
            } else {
                this.showToast('Error', 'Minimum One Product required!', 'error');
            }
        } catch (error) {
            console.log('## in the error: ', JSON.stringify(error));
        }
    }
    
    renderedCallback() {
        Promise.all([
            loadStyle(this, customStyle)
        ]);
    }

    connectedCallback() {
        this.documentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.documentClickHandler);
        this.getProductRecord(this.searchVal);
        this.getProductRecordBundle(this.searchValBundle);
        this.loadPriceBookOptions();
        this.initializePricingRows();
        this.loadOrgDefaultCurrency();

        // Pagination: compute initial page size from viewport width and
        // keep it in sync on resize (debounced).
        this.updatePageSize();
        this._resizeHandler = () => {
            window.clearTimeout(this._resizeTimeout);
            this._resizeTimeout = window.setTimeout(() => this.updatePageSize(), 150);
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    async loadOrgDefaultCurrency() {
        try {
            const config = await getAdminConfig();
            this.orgDefaultCurrency = normalizeCurrencyCode(config?.QuoteForce__Currency__c);
        } catch (error) {
            console.log('Failed to load org Default Currency', error);
        }
    }

    disconnectedCallback() {
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        window.clearTimeout(this._resizeTimeout);
    }

    // ---------------- Pagination helpers ----------------

    updatePageSize() {
        const width = window.innerWidth;
        let columns = 1;
        if (width >= 1200) {
            columns = 4;
        } else if (width >= 900) {
            columns = 3;
        } else if (width >= 600) {
            columns = 2;
        } else {
            columns = 1;
        }
        const newSize = columns * 2;
        if (newSize !== this.pageSize) {
            this.pageSize = newSize;
            this.currentPage = 1;
        }
    }

    get totalPages() {
        const total = this.productRecords ? this.productRecords.length : 0;
        return Math.max(1, Math.ceil(total / this.pageSize));
    }

    get paginatedProductRecords() {
        if (!this.productRecords || this.productRecords.length === 0) {
            return [];
        }
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
        const start = (this.currentPage - 1) * this.pageSize;
        return this.productRecords.slice(start, start + this.pageSize);
    }

    get showPagination() {
        return this.totalPages > 1;
    }

    get isFirstPage() {
        return this.currentPage <= 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    get pageNumbers() {
        return Array.from({ length: this.totalPages }, (_, i) => {
            const pageValue = i + 1;
            const isActive = pageValue === this.currentPage;
            return {
                value: pageValue,
                label: `${pageValue}`,
                className: isActive ? 'qf-page-btn qf-page-btn--active' : 'qf-page-btn'
            };
        });
    }

    handlePrevPage() {
        if (this.currentPage > 1) {
            this.currentPage = this.currentPage - 1;
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage = this.currentPage + 1;
        }
    }

    handleGoToPage(event) {
        const page = Number(event.currentTarget.dataset.page);
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    // ------------------------------------------------------

    get bundlePriceBookFilterOptions() {
        return [
            { label: 'All', value: '' },
            ...(this.priceBookOptions || []).map(pb => ({
                label: pb.label,
                value: pb.value
            }))
        ];
    }

    handleBundlePriceBookFilter(event) {
        this.bundlePriceBookFilter = event.detail.value;
        this.selectedProdBundleId = '';
        this.productItemList = [];
        this.getProductRecordBundle(this.searchValBundle);
    }

      getProductRecord(search) {
        console.log('### LWC getProductRecord called: search="' + search + '", currencyFilter="' + this.currencyFilter + '"');
    
    GetProducts({
            searchKey: search,
            currencyFilter: this.currencyFilter
        })
        .then(result => {
            console.log('### LWC GetProducts success result:', JSON.stringify(result));
            this.showMessageProducts = result.length === 0;

            this.productRecords = result.map(prod => {
                const rawPrice = prod.QuoteForce__Default_Price__c != null ? prod.QuoteForce__Default_Price__c : 0;
                const normalizedCurrencyCode = normalizeCurrencyCode(prod.QuoteForce__Currency__c);
                const currencySymbol = this.currencySymbols[normalizedCurrencyCode] || ' ';
                const isProductActive = prod.QuoteForce__Active__c === true;

                return {
                    ...prod,
                    QuoteForce__Default_Price__c: rawPrice,
                    normalizedCurrencyCode,
                    currencySymbol,
                    displayName: prod.QuoteForce__Product_Code__c
                        ? `${prod.Name} (${prod.QuoteForce__Product_Code__c})`
                        : prod.Name,
                    productImageUrl: buildProductImageUrl(prod.QuoteForce__ContentDocumentLink_Id__c),
                    productInitial: (prod.Name || 'P').trim().split(/\s+/)[0],
                    defaultPriceLabel: `${currencySymbol}${rawPrice}`,
                    isProductActive,
                    activeStatusLabel: isProductActive ? 'Active' : 'Inactive',
                    activeStatusClass: isProductActive
                        ? 'status-pill status-pill--active'
                        : 'status-pill status-pill--inactive'
                };
            });
            console.log('### LWC mapped productRecords:', JSON.stringify(this.productRecords));
        })
        .catch(error => {
            console.error('### LWC GetProducts error:', error);
            this.showMessageProducts = true;
        });
    }

    

    getProductRecordBundle(search) {
        GetProductsBundle({
            searchKey: search,
            currencyFilter: this.bundleCurrencyFilter
        })
        .then(result => {
            const filtered = this.bundlePriceBookFilter
                ? result.filter(b => b.priceBookId === this.bundlePriceBookFilter)
                : result;

            this.showMessage = filtered.length === 0;
            this.productBundleRecords = [];

            if (filtered.length > 0) {
                const currentId = this.selectedProdBundleId;
                const stillExists = filtered.some(b => b.bundleId === currentId);
                const toSelectId = stillExists ? currentId : filtered[0].bundleId;

                this.productBundleRecords = filtered.map(b => ({
                    ...b,
                    selected: b.bundleId === toSelectId
                }));

                if (!stillExists || !currentId) {
                this.selectedProdBundleId = toSelectId;
                const selectedBundle = filtered.find(b => b.bundleId === toSelectId);
                this.bundlePriceBookId = selectedBundle?.priceBookId || '';
                this.bundleCurrency = selectedBundle?.currencyCode || '';
                this.existingBundlePriceBookSearchTerm = selectedBundle?.priceBookName || '';
                this.getProductItems(toSelectId);
            }
            }

            this.isShow = filtered.length > 0;
        })
        .catch(error => {
            this.isShow = false;
            this.showMessage = true;
        });
    }

    handleSearchChangeBundle(event) {
        const searchTerm = event.target.value;
        this.searchValBundle = searchTerm;
        this.getProductRecordBundle(this.searchValBundle);
    }

    handleSearchChange(event) {
        const searchTerm = event.target.value;
        this.searchVal = searchTerm;
        this.currentPage = 1;
        this.getProductRecord(this.searchVal);
    }

    async handelOnClickNewProd() {
        this.NewProdBool = (this.NewProdBool == true) ? false : true;
        if (this.NewProdBool) {
            this.resetProductModalStep();

            if (!this.orgDefaultCurrency) {
                await this.loadOrgDefaultCurrency();
            }
            this.selectedCurrency = this.orgDefaultCurrency || 'USD';

            await this.loadPriceBookOptions();
            this.initializePricingRows();
        }
    }

    get isBasicInfoStep() {
        return this.currentProductModalStep === 'basic';
    }

    get isProductImageStep() {
        return this.currentProductModalStep === 'image';
    }

    get isPricingSetupStep() {
        return this.currentProductModalStep === 'pricing';
    }

    get basicInfoTabClass() {
        return this.getProductModalTabClass('basic');
    }

    get productImageTabClass() {
        return this.getProductModalTabClass('image');
    }

    get pricingSetupTabClass() {
        return this.getProductModalTabClass('pricing');
    }

    get showPreviousProductStepButton() {
        return this.currentProductModalStep !== 'basic';
    }

    get showNextProductStepButton() {
        return this.currentProductModalStep !== 'pricing';
    }

    get nextProductStepLabel() {
        if (this.currentProductModalStep === 'basic') {
            return 'Next: Product Image';
        }
        if (this.currentProductModalStep === 'image') {
            return 'Next: Pricing Setup';
        }
        return 'Next';
    }

    get previousProductStepLabel() {
        if (this.currentProductModalStep === 'pricing') {
            return 'Previous: Product Image';
        }
        if (this.currentProductModalStep === 'image') {
            return 'Previous: Basic Information';
        }
        return 'Previous';
    }

    resetProductModalStep() {
        this.currentProductModalStep = 'basic';
    }

    getProductModalTabClass(step) {
        // UI-only enhancement: previously this returned just the base class
        // plus "--active". It still does exactly that, and additionally
        // marks steps that come before the current one as "--completed"
        // (used purely for the checkmark styling on the stepper). No new
        // @track property, no change to currentProductModalStep itself,
        // and no change to any caller's usage.
        const stepOrder = ['basic', 'image', 'pricing'];
        const currentIndex = stepOrder.indexOf(this.currentProductModalStep);
        const stepIndex = stepOrder.indexOf(step);

        if (this.currentProductModalStep === step) {
            return 'product-modal-tab product-modal-tab--active';
        }
        if (stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex) {
            return 'product-modal-tab product-modal-tab--completed';
        }
        return 'product-modal-tab';
    }

    // ============================================================
    // VALIDATION: Product Image / Pricing Setup steps must not be
    // reachable until Basic Information (Product Name, Product Code,
    // Default Quantity) is complete. This is additive — it does not
    // touch validateNewProductForm()/validateEditProductForm() (the
    // full Save-time validation), it only gates step navigation.
    // ============================================================
    get isBasicInfoValid() {
        const nameOk = !!(this.productNameValue && this.productNameValue.trim() !== '');
        const codeOk = !!(this.ProductCodeValue && this.ProductCodeValue.trim() !== '');
        const qty = Number(this.productDQValue);
        const qtyOk = this.productDQValue !== '' && this.productDQValue !== null
            && this.productDQValue !== undefined && !isNaN(qty) && qty >= 1;
        return nameOk && codeOk && qtyOk;
    }

    get isProductImageTabDisabled() {
        return !this.isBasicInfoValid;
    }

    get isPricingSetupTabDisabled() {
        return !this.isBasicInfoValid;
    }

    validateBasicInfoStepFields() {
        let isValid = true;

        const nameInput = this.template.querySelector('lightning-input[name="Product Name"]');
        if (nameInput) {
            if (!this.productNameValue || this.productNameValue.trim() === '') {
                nameInput.setCustomValidity('Product Name is required.');
                isValid = false;
            } else {
                nameInput.setCustomValidity('');
            }
            nameInput.reportValidity();
        } else if (!this.productNameValue || this.productNameValue.trim() === '') {
            isValid = false;
        }

        const codeInput = this.template.querySelector('lightning-input[name="Product Code"]');
        if (codeInput) {
            if (!this.ProductCodeValue || this.ProductCodeValue.trim() === '') {
                codeInput.setCustomValidity('Product Code is required.');
                isValid = false;
            } else {
                codeInput.setCustomValidity('');
            }
            codeInput.reportValidity();
        } else if (!this.ProductCodeValue || this.ProductCodeValue.trim() === '') {
            isValid = false;
        }

        const qtyInput = this.template.querySelector('.modal-step-panel lightning-input[name="Default Quantity"]');
        const qty = Number(this.productDQValue);
        const qtyInvalid = this.productDQValue === '' || this.productDQValue === null
            || this.productDQValue === undefined || isNaN(qty) || qty < 1;
        if (qtyInput) {
            if (qtyInvalid) {
                qtyInput.setCustomValidity('Default Quantity must be a valid number greater than or equal to 1.');
                isValid = false;
            } else {
                qtyInput.setCustomValidity('');
            }
            qtyInput.reportValidity();
        } else if (qtyInvalid) {
            isValid = false;
        }

        if (!isValid) {
            this.showToast('Error', 'Please complete Product Name, Product Code, and Default Quantity before continuing.', 'error');
        }

        return isValid;
    }

    handleProductModalStepChange(event) {
        const targetStep = event.currentTarget.dataset.step;
        if ((targetStep === 'image' || targetStep === 'pricing') && !this.isBasicInfoValid) {
            this.validateBasicInfoStepFields();
            return;
        }
        this.currentProductModalStep = targetStep;
    }

    handleNextProductModalStep() {
        if (this.currentProductModalStep === 'basic') {
            if (!this.validateBasicInfoStepFields()) {
                return;
            }
            this.currentProductModalStep = 'image';
        } else if (this.currentProductModalStep === 'image') {
            this.currentProductModalStep = 'pricing';
        }
    }

    handlePreviousProductModalStep() {
        if (this.currentProductModalStep === 'pricing') {
            this.currentProductModalStep = 'image';
        } else if (this.currentProductModalStep === 'image') {
            this.currentProductModalStep = 'basic';
        }
    }

    get pricingPriceBookOptions() {
        return [
            {
                label: '+ New Pricebook',
                value: NEW_PRICEBOOK_OPTION,
                name: '+ New Pricebook',
                currencyCode: '',
                searchText: 'new pricebook create new'
            },
            ...this.priceBookOptions
        ];
    }

    

    handleImageDeleteConfirm() {
        this.isShowImageDeleteModal = true;
    }

    hideImageDeleteModal() {
        this.isShowImageDeleteModal = false;
    }

    handleImageDeleteConfirmed() {
        this.isShowImageDeleteModal = false;
        if (this.editProdBool) {
            this.handleImageDelete();
        } else {
            this.handleImageRemove();
        }
    }

    get bundlePriceBookOptions() {
        return (this.priceBookOptions || []).filter((option) => option.isActive !== false);
    }

    get filteredBundlePriceBookOptions() {
        return this.filterPriceBookOptions(this.bundlePriceBookSearchTerm);
    }

    get hasFilteredBundlePriceBookOptions() {
        return this.filteredBundlePriceBookOptions.length > 0;
    }

    get filteredExistingBundlePriceBookOptions() {
        return this.filterPriceBookOptions(this.existingBundlePriceBookSearchTerm);
    }

    get hasFilteredExistingBundlePriceBookOptions() {
        return this.filteredExistingBundlePriceBookOptions.length > 0;
    }

    get selectedBundlePriceBookLabel() {
        const selectedPriceBook = (this.bundlePriceBookOptions || []).find((option) => option.value === this.bundlePriceBookId);
        return selectedPriceBook?.label || 'Select Pricebook';
    }

    get bundlePriceBookComboboxClass() {
        return `custom-combobox__control${this.isBundlePriceBookDropdownOpen ? ' custom-combobox__control--open' : ''}`;
    }

    get existingBundlePriceBookComboboxClass() {
        return `custom-combobox__control${this.isExistingBundlePriceBookDropdownOpen ? ' custom-combobox__control--open' : ''}`;
    }

    get bundleEntryComboboxClass() {
        return `custom-combobox__control${this.isBundleEntryPickerDisabled ? ' custom-combobox__control--disabled' : ''}`;
    }

    filterPriceBookOptions(searchTerm) {
        const normalizedSearchTerm = (searchTerm || '').trim().toLowerCase();
        const baseOptions = this.bundlePriceBookOptions || [];

        if (!normalizedSearchTerm) {
            return baseOptions;
        }

        return baseOptions.filter((option) =>
            (option.searchText || '').includes(normalizedSearchTerm) ||
            (option.label || '').toLowerCase().includes(normalizedSearchTerm) ||
            (option.name || '').toLowerCase().includes(normalizedSearchTerm) ||
            (option.currencyCode || '').toLowerCase().includes(normalizedSearchTerm)
        );
    }

    async loadPriceBookOptions() {
        try {
            const result = await listPriceBooks({
                searchKey: '',
                currencyFilter: '',
                activeOnly: false
            });
            this.priceBookOptions = (result || []).map((priceBook) => ({
                label: priceBook.QuoteForce__Currency__c
                    ? `${priceBook.Name} (${priceBook.QuoteForce__Currency__c})`
                    : priceBook.Name,
                value: priceBook.Id,
                name: priceBook.Name,
                currencyCode: priceBook.QuoteForce__Currency__c || '',
                isActive: priceBook.QuoteForce__Is_Active__c,
                isDefault: priceBook.QuoteForce__Is_Default__c,
                searchText: `${priceBook.Name || ''} ${priceBook.QuoteForce__Currency__c || ''}`.toLowerCase()
            }));
            this.refreshPricingRowOptions();
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        }
    }

    async loadBundleEntryOptions(priceBookId) {
        if (!priceBookId) {
            this.bundleEntryOptions = [];
            return;
        }

        try {
            const result = await getPriceBookEntriesByPriceBook({ priceBookId });
            this.bundleEntryOptions = (result || [])
                .filter((entry) => entry.QuoteForce__Product__r?.QuoteForce__Active__c === true)
                .map((entry) => ({
                    label: entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c
                        ? `${entry.QuoteForce__Product__r.Name} (${entry.QuoteForce__Product__r.QuoteForce__Product_Code__c})`
                        : (entry.QuoteForce__Product__r?.Name || entry.Name),
                    value: entry.Id,
                    productId: entry.QuoteForce__Product__c,
                    unitPrice: entry.QuoteForce__Unit_Price__c || 0,
                    searchText: `${entry.QuoteForce__Product__r?.Name || ''} ${entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c || ''} ${entry.Name || ''}`.toLowerCase()
                }));
            this.refreshBundleItemOptions();
        } catch (error) {
            this.bundleEntryOptions = [];
            this.refreshBundleItemOptions();
            this.showToast('Error', this.normalizeError(error), 'error');
        }
    }

    resetBundleInsertRows() {
        this.productItemListInsert = [
            this.buildBundleRowWithOptions(createBundleItemRow(1), 'insert')
        ];
    }

    syncBundleRowFromEntry(row, entryId, listName = 'existing') {
        const selectedEntry = this.bundleEntryOptions.find((option) => option.value === entryId);
        if (!selectedEntry) {
            return this.buildBundleRowWithOptions({
                ...row,
                priceBookEntryId: '',
                priceBookEntryLabel: 'Select Price Book Entry',
                productId: '',
                Quantity: 0,
                Price: 0,
                LineTotal: 0
            }, listName);
        }

        const quantity = Number(row.Quantity) > 0 ? Number(row.Quantity) : 1;
        const price = Number(selectedEntry.unitPrice || 0);

        return this.buildBundleRowWithOptions({
            ...row,
            priceBookEntryId: entryId,
            priceBookEntryLabel: selectedEntry.label,
            entrySearchTerm: selectedEntry.label,
            productId: selectedEntry.productId,
            Quantity: quantity,
            Price: price,
            LineTotal: (price * quantity).toFixed(2)
        }, listName);
    }

    buildBundleRowWithOptions(row, listName = 'existing') {
        const normalizedSearchTerm = (row.entrySearchTerm || '').trim().toLowerCase();

        const currentList = listName === 'insert'
            ? (this.productItemListInsert || [])
            : (this.productItemList || []);

        const selectedProductIds = new Set(
            currentList
                .filter(r => r.Id !== row.Id && r.productId)
                .map(r => r.productId)
        );

        const availableOptions = (this.bundleEntryOptions || []).filter(
            option => !selectedProductIds.has(option.productId) || option.productId === row.productId
        );

        const filteredEntryOptions = normalizedSearchTerm
            ? availableOptions.filter(option => option.searchText.includes(normalizedSearchTerm))
            : [...availableOptions];

        const openAbove = row.openAbove || false;
        const dropdownClass = openAbove
            ? 'custom-combobox__dropdown custom-combobox__dropdown--above'
            : 'custom-combobox__dropdown';

        return {
            ...row,
            filteredEntryOptions,
            hasFilteredEntryOptions: filteredEntryOptions.length > 0,
            openAbove,
            dropdownClass
        };
    }

    refreshBundleItemOptions() {
        this.productItemList = (this.productItemList || [])
            .map(row => this.buildBundleRowWithOptions(row, 'existing'));
        this.productItemListInsert = (this.productItemListInsert || [])
            .map(row => this.buildBundleRowWithOptions(row, 'insert'));
    }

    filterPricingPriceBookOptions(searchTerm) {
        const normalizedSearchTerm = (searchTerm || '').trim().toLowerCase();
        const baseOptions = this.pricingPriceBookOptions || [];

        if (!normalizedSearchTerm) {
            return baseOptions;
        }

        return baseOptions.filter((option) =>
            (option.searchText || '').includes(normalizedSearchTerm) ||
            (option.label || '').toLowerCase().includes(normalizedSearchTerm) ||
            (option.name || '').toLowerCase().includes(normalizedSearchTerm) ||
            (option.currencyCode || '').toLowerCase().includes(normalizedSearchTerm)
        );
    }

    buildPricingRowWithOptions(row) {
        const filteredPriceBookOptions = this.filterPricingPriceBookOptions(row.priceBookSearchTerm);
        const selectedOption = (this.pricingPriceBookOptions || []).find((option) => option.value === row.priceBookSelection);

        return {
            ...row,
            filteredPriceBookOptions,
            hasFilteredPriceBookOptions: filteredPriceBookOptions.length > 0,
            selectedPriceBookLabel: selectedOption?.label || 'Select Pricebook'
        };
    }

    refreshPricingRowOptions() {
        this.pricingRows = (this.pricingRows || []).map((row) => this.buildPricingRowWithOptions(row));
    }

    initializePricingRows() {
        this.pricingRowSequence = 1;
        this.pricingRows = [this.buildPricingRowWithOptions(createPricingRow(this.pricingRowSequence, this.selectedCurrency))];
    }

    createNextPricingRow() {
        this.pricingRowSequence += 1;
        return this.buildPricingRowWithOptions(createPricingRow(this.pricingRowSequence, this.selectedCurrency));
    }

    buildPricingRowsFromEntries(entries) {
        if (!entries?.length) {
            this.initializePricingRows();
            return;
        }

        this.pricingRows = entries.map((entry, index) => this.buildPricingRowWithOptions({
            id: `pricing-row-${index + 1}`,
            entryId: entry.Id,
            priceBookSelection: entry.QuoteForce__Price_Book__c,
            priceBookId: entry.QuoteForce__Price_Book__c,
            priceBookSearchTerm: '',
            unitPrice: entry.QuoteForce__Unit_Price__c,
            currency: entry.QuoteForce__Currency__c || entry.QuoteForce__Price_Book__r?.QuoteForce__Currency__c || this.selectedCurrency,
            isActive: entry.QuoteForce__Is_Active__c,
            isNewPriceBook: false,
            draftPriceBook: createDraftPriceBook(entry.QuoteForce__Currency__c || this.selectedCurrency)
        }));
        this.pricingRowSequence = entries.length;
    }

    addPricingRow() {
        this.pricingRows = [...this.pricingRows, this.createNextPricingRow()];
    }

    removePricingRow(event) {
        const rowId = event.currentTarget.dataset.rowId;
        const remainingRows = this.pricingRows.filter((row) => row.id !== rowId);
        this.pricingRows = remainingRows.length > 0
            ? remainingRows
            : [this.buildPricingRowWithOptions(createPricingRow(++this.pricingRowSequence, this.selectedCurrency))];
    }

    handlePricingRowChange(event) {
        const rowId = event.target.dataset.rowId;
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);

        this.pricingRows = this.pricingRows.map((row) => {
            if (row.id !== rowId) {
                return row;
            }

            const updatedRow = {
                ...row,
                draftPriceBook: { ...row.draftPriceBook }
            };

            if (fieldName === 'priceBookSelection') {
                updatedRow.priceBookSelection = value;
                updatedRow.priceBookSearchTerm = '';
                updatedRow.isPriceBookDropdownOpen = false;
                if (value === NEW_PRICEBOOK_OPTION) {
                    this.activePricingRowId = rowId;
                    this.newPriceBookForm = { ...EMPTY_NEW_PRICEBOOK_FORM };
                    this.isNewPriceBookPopupOpen = true;
                    return this.buildPricingRowWithOptions(row); // row unchanged
                } else {
                    const selectedOption = this.priceBookOptions.find((option) => option.value === value);
                    updatedRow.priceBookId = value;
                    updatedRow.isNewPriceBook = false;
                    updatedRow.currency = selectedOption?.currencyCode || this.selectedCurrency;
                    updatedRow.draftPriceBook = createDraftPriceBook(updatedRow.currency);
                }
            } else if (fieldName === 'unitPrice') {
                const parsed = parseFloat(value);
                updatedRow.unitPrice = isNaN(parsed) ? 0 : parsed;
            } else if (fieldName === 'isActive') {
                updatedRow.isActive = value;
            }

            return this.buildPricingRowWithOptions(updatedRow);
        });
    }

    closeNewPriceBookPopup() {
        this.isNewPriceBookPopupOpen = false;
        this.newPriceBookForm = { ...EMPTY_NEW_PRICEBOOK_FORM };
        this.activePricingRowId = null;
    }

    handleNewPriceBookFormChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);

        this.newPriceBookForm = {
            ...this.newPriceBookForm,
            [fieldName]: value
        };
    }

    async saveNewPriceBookPopup() {
        const trimmedName = this.newPriceBookForm.Name?.trim();

        if (!trimmedName) {
            this.showToast('Error', 'Price Book name is required.', 'error');
            return;
        }

        const nameAlreadyExists = (this.priceBookOptions || []).some(
            (option) => option.name?.toLowerCase() === trimmedName.toLowerCase()
        );
        if (nameAlreadyExists) {
            this.showToast('Error', 'A PriceBook with this name already exists.', 'error');
            return;
        }

        const lowerName = trimmedName.toLowerCase();
        const matchedCurrency = this.currencyOptions
            .map((option) => option.value)
            .find((code) => lowerName.includes(code.toLowerCase()));

        if (matchedCurrency) {
            this.showToast('Error', `PriceBook name cannot contain the currency code "${matchedCurrency}".`, 'error');
            return;
        }

        this.loaded = true;
        try {
            const result = await upsertPriceBook({
                priceBookRecord: {
                    Id: null,
                    Name: trimmedName,
                    QuoteForce__Currency__c: this.newPriceBookForm.QuoteForce__Currency__c || null,
                    QuoteForce__Description__c: this.newPriceBookForm.QuoteForce__Description__c,
                    QuoteForce__Is_Active__c: this.newPriceBookForm.QuoteForce__Is_Active__c,
                    QuoteForce__Is_Default__c: this.newPriceBookForm.QuoteForce__Is_Default__c
                }
            });

            const newId = result?.Id || result;
            const newCurrency = this.newPriceBookForm.QuoteForce__Currency__c;

            await this.loadPriceBookOptions();

            if (this.activePricingRowId) {
                this.pricingRows = this.pricingRows.map((row) => {
                    if (row.id !== this.activePricingRowId) {
                        return row;
                    }
                    return this.buildPricingRowWithOptions({
                        ...row,
                        priceBookSelection: newId,
                        priceBookId: newId,
                        isNewPriceBook: false,
                        currency: newCurrency
                    });
                });
            }

            this.showToast('Success', 'Price Book created successfully.', 'success');
            this.closeNewPriceBookPopup();

        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.loaded = false;
        }
    }

    handleDraftPriceBookChange(event) {
        const rowId = event.target.dataset.rowId;
        const fieldName = event.target.dataset.field;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : (event.detail?.value ?? event.target.value);

        this.pricingRows = this.pricingRows.map((row) => {
            if (row.id !== rowId) {
                return row;
            }

            const updatedDraft = {
                ...row.draftPriceBook,
                [fieldName]: value
            };

            return {
                ...row,
                draftPriceBook: updatedDraft,
                currency: fieldName === 'currencyCode' ? value : row.currency
            };
        });
    }

    handleOnChangeNewProd(event) {
        const field = event.target.name;
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value;

        switch (field) {
            case 'Product Name':
                this.productNameValue = value;
                break;

            case 'Product Code':
                this.ProductCodeValue = value;
                const isDuplicate = this.productRecords?.some(
                    rec => rec.QuoteForce__Product_Code__c === this.ProductCodeValue &&
                           rec.QuoteForce__Currency__c === this.selectedCurrency
                );
                if (isDuplicate) {
                    event.target.setCustomValidity('Product code already exists for this currency');
                } else {
                    event.target.setCustomValidity('');
                }
                event.target.reportValidity();
                break;

            case 'Product Description':
                this.productDescriptionValue = value;
                break;

            case 'Unit per Cost':
                this.productUPCValue = value;
                break;

            case 'Default Quantity':
                this.productDQValue = value;
                break;

            case 'Active':
                this.isactive = value;
                break;

            default:
                console.warn('[handleOnChangeNewProd] Unknown field:', field);
        }
    }

    handleOnChangeEditProd(event) {
        let label = event.target.label;
        if (label === 'Product Name:') {
            this.productNameValue = event.target.value;
        } else if (label === 'Product Code:') {
            this.ProductCodeValue = event.target.value;
        } else if (label === 'Product Description:') {
            this.productDescriptionValue = event.target.value;
        } else if (label === 'Default Quantity:') {
            this.productDQValue = event.target.value;
        } else if (label === 'Active') {
            this.isactive = event.target.checked;
        }
    }

    handelOnClickCancelNewProd() {
        this.NewProdBool = false;
        this.resetForm();
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
async updateDefaultPrice(event) {
    let value = event.target.value;
    let prodId = event.currentTarget.dataset.id;

    this.productRecords = this.productRecords.map(el =>
        el.Id === prodId ? { ...el, QuoteForce__Default_Price__c: value } : el
    );

    var prodObj = this.buildInlineProductUpdatePayload(prodId, {
        'QuoteForce__Default_Price__c': value
    });
    this.updateProductFunction(prodObj);

    try {
       await updatePriceBookEntriesPrice({
    productId: prodId,
    newPrice: parseFloat(value),
    currencyCode: normalizeCurrencyCode(
        this.productRecords.find(p => p.Id === prodId)?.QuoteForce__Currency__c
    )
});
    } catch (error) {
        this.showToast('Error', this.normalizeError(error), 'error');
    }
}
    onchangeNumber(event) {
        event.target.value = event.target.value.replace(/[^0-9\-]/g, '');
    }

    preventDecimal(event) {
        if (event.key === '.' || event.key === 'e') {
            event.preventDefault();
        }
    }

    updateDefaultQuantity(event) {
        let value = event.target.value;
        let prodId = event.currentTarget.dataset.id;
        if (value < 1) {
            this.showToast('Error', 'Default Quantity must be greater than or equal to 1', 'error');
            return;
        }
        this.productRecords = this.productRecords.map(el =>
            el.Id === prodId ? { ...el, QuoteForce__Default_Quantity__c: value } : el
        );
        var prodObj = this.buildInlineProductUpdatePayload(prodId, {
            'QuoteForce__Default_Quantity__c': value
        });
        this.updateProductFunction(prodObj);
    }

    updateProductLineItemPrice(event) {
        let value = event.target.value;
        let plItemId = event.currentTarget.dataset.id;
        let tempPLIObj = {
            'Id': plItemId,
            'QuoteForce__Price__c': value
        };
        this.updateProductLineRecords(tempPLIObj);
    }

    updateProductLineItemQuantity(event) {
        let value = event.target.value;
        let plItemId = event.currentTarget.dataset.id;
        let tempPLIObj = {
            'Id': plItemId,
            'QuoteForce__Quantity__c': value
        };
        this.updateProductLineRecords(tempPLIObj);
    }

    updateProductLineItemProduct(event) {
        let value = event.target.value;
        let plItemId = event.currentTarget.dataset.id;

        if (value == null) {
            let tempPLIObj = {
                'Id': plItemId,
                'QuoteForce__Price_Book_Entry__c': value,
                'QuoteForce__Product__c': null,
                'QuoteForce__Quantity__c': 0,
                'QuoteForce__Price__c': 0
            };
            this.updateProductLineRecords(tempPLIObj);
        } else {
            const selectedEntry = this.bundleEntryOptions.find((option) => option.value === value);
            let Quantity = selectedEntry ? 1 : 0;
            let Price = selectedEntry ? selectedEntry.unitPrice : 0;

            let tempPLIObj = {
                'Id': plItemId,
                'QuoteForce__Price_Book_Entry__c': value,
                'QuoteForce__Product__c': selectedEntry?.productId,
                'QuoteForce__Quantity__c': Quantity,
                'QuoteForce__Price__c': Price
            };
            this.updateProductLineRecords(tempPLIObj);
        }
    }

    async updateProductLineRecords(obj) {
        try {
            await updateProductLineItems({ plitem_Obj: obj });
        } catch (error) {
            console.log('Error: ', error);
        }
    }

    async handleOnProductAction(event) {
        let label = event.currentTarget.dataset.label;
        this.productActionId = event.currentTarget.dataset.id;
        this.productDelete = (label == 'Delete') ? true : false;
        this.productClear = (label == 'Clear') ? true : false;

        if (this.productDelete) {
            const childCheck = await hasChildRecords({ parentId: this.productActionId });

            if (childCheck.hasBundleLineItems) {
                this.blockedByBundle = true;
                this.isShowModalNotDelete = true;
                return;
            }

            this.hasPriceBookEntriesWarning = childCheck.hasPriceBookEntries;
            this.isShowModal = true;
        } else {
            this.isShowModal = true;
        }
    }

    hideModalBox() {
        this.isShowModal = false;
        this.hasPriceBookEntriesWarning = false;
    }

    hidNotDeleteModalBox() {
        this.isShowModalNotDelete = false;
        this.blockedByBundle = false;
    }

    handleClickDelete() {
        deleteProduct({ Id: this.productActionId })
            .then(result => {
                this.getProductRecord(this.searchVal);
                this.hideModalBox();
                this.showToast('Success', 'Product Deleted Successfully!', 'success');
            })
            .catch(error => {
                this.showToast('Error', error.body ? error.body.message : '', 'error');
            });
    }

    
    async handleClickClear() {
        this.productRecords = this.productRecords.map(el => {
            if (el.Id !== this.productActionId) {
                return el;
            }
            return {
                ...el,
                QuoteForce__Default_Quantity__c: 1,
                QuoteForce__Default_Price__c: 0,
                defaultPriceLabel: `${el.currencySymbol}0`
            };
        });

        const prod = this.productRecords.find(p => p.Id === this.productActionId);
        const currencyCode = normalizeCurrencyCode(prod?.QuoteForce__Currency__c);

        var prodObj = this.buildInlineProductUpdatePayload(this.productActionId, {
            'QuoteForce__Default_Quantity__c': 1,
            'QuoteForce__Default_Price__c': 0
        });

        try {
            await updateProduct({ prod_Obj: prodObj });

            await updatePriceBookEntriesPrice({
                productId: this.productActionId,
                newPrice: 0,
                currencyCode: currencyCode
            });

            this.showToast('Success', 'Product cleared successfully!', 'success');
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        }

        this.hideModalBox();
    }

    buildInlineProductUpdatePayload(productId, overrides = {}) {
        const currentProduct = (this.productRecords || []).find((item) => item.Id === productId);

        return {
            Id: productId,
            Name: currentProduct?.Name || '',
            QuoteForce__Product_Code__c: currentProduct?.QuoteForce__Product_Code__c || '',
            QuoteForce__Currency__c: currentProduct?.QuoteForce__Currency__c || '',
            QuoteForce__Description__c: currentProduct?.QuoteForce__Description__c || '',
            QuoteForce__Active__c: currentProduct?.QuoteForce__Active__c || false,
            QuoteForce__Default_Price__c: currentProduct?.QuoteForce__Default_Price__c || 0,
            QuoteForce__Default_Quantity__c: currentProduct?.QuoteForce__Default_Quantity__c || 1,
            ...overrides
        };
    }

    updateProductFunction(Object) {
        updateProduct({ prod_Obj: Object })
            .then(result => {
                this.showToast('Success', 'Product Updated successfully!', 'success');
            })
            .catch(error => {
                this.showToast('Error', error.body ? error.body.message : '', 'error');
            });
    }

    handleChangeBundle(event) {
        let label = event.target.label;

        if (label === 'Bundle Name') {
            this.bundleNameValue = event.target.value;
        } else if (label === 'Description') {
            this.bundleDescriptionValue = event.target.value;
        }
    }

    handleClickCancelProductBundle() {
        this.productBundle = false;
        this.closeAllDropdowns();
    }

    handleClickNewProductBundle() {
        this.productBundle = true;
        this.bundleNameValue = '';
        this.bundleDescriptionValue = '';
        this.bundleCurrency = '';
        this.bundlePriceBookId = '';
        this.bundlePriceBookSearchTerm = '';
        this.bundleEntryOptions = [];
        this.currencyLocked = false;
        this.closeAllDropdowns();
        this.resetBundleInsertRows();
    }

    async handleClickInsertProductBundle() {
        if (!this.bundlePriceBookId) {
            this.showToast('Error', 'Please select a Pricebook', 'error');
            return;
        }

        if (!this.bundleNameValue || !this.bundleNameValue.trim()) {
            this.showToast('Error', 'Please enter product bundle name', 'error');
            return;
        }

        const normalizedBundleName = this.bundleNameValue.trim().toLowerCase();
        const isBundleNameDuplicate = (this.productBundleRecords || []).some(
            (bundle) => (bundle.name || '').trim().toLowerCase() === normalizedBundleName
        );
        if (isBundleNameDuplicate) {
            this.showToast('Error', 'A Product Bundle with this name already exists.', 'error');
            return;
        }

        const validItems = this.productItemListInsert.filter(
            (item) => item.priceBookEntryId && item.productId
        );

        if (validItems.length === 0) {
            this.showToast('Error', 'Please add at least one Price Book Entry.', 'error');
            return;
        }

        const selectedPriceBook = this.bundlePriceBookOptions.find(
            (option) => option.value === this.bundlePriceBookId
        );

        const productObj = {
            'Name': this.bundleNameValue,
            'QuoteForce__Description__c': this.bundleDescriptionValue,
            'QuoteForce__Currency__c': selectedPriceBook?.currencyCode || null,
            'QuoteForce__Price_Book__c': this.bundlePriceBookId
        };

        try {
            const bundleResult = await insertProductBundle({ prod_Bundle_Obj: productObj });

            const lineItems = validItems.map(element => ({
                'QuoteForce__Product_Bundle__c': bundleResult.Id,
                'QuoteForce__Quantity__c': element.Quantity,
                'QuoteForce__Product__c': element.productId,
                'QuoteForce__Price_Book_Entry__c': element.priceBookEntryId,
                'QuoteForce__Price__c': element.Price
            }));

            await insertProductLineItm({ prod_itm_Lst: lineItems });

            this.productItems = [];
            this.resetBundleInsertRows();
            this.bundleEntryOptions = [];
            this.bundlePriceBookId = '';
            this.bundlePriceBookSearchTerm = '';
            this.productBundle = false;
            this.closeAllDropdowns();
            this.showToast('Success', 'Product bundle created successfully!', 'success');
            this.getProductRecordBundle(this.searchValBundle);

        } catch (error) {
            this.showToast('Error', error.body ? error.body.message : '', 'error');
        }
    }

    handleClickTab(event) {
        let id = event.currentTarget.dataset.id;

        if (id === this.selectedProdBundleId) {
            return;
        }

        const emptyRows = this.productItemList.filter(
            (item) => !item.priceBookEntryId && item.Id && item.Id !== ''
        );
        emptyRows.forEach(row => {
            deleteProductLineItems({ Id: row.Id }).catch(err => console.error(err));
        });

        this.selectedProdBundleId = id;
        this.productItemList = [];

        this.productBundleRecords = this.productBundleRecords.map(element => ({
            ...element,
            selected: element.bundleId === id
        }));

        const selectedBundle = this.productBundleRecords.find(b => b.bundleId === id);
        if (selectedBundle) {
            this.bundleCurrency = selectedBundle.currencyCode || '';
            this.bundlePriceBookId = selectedBundle.priceBookId || '';
            this.existingBundlePriceBookSearchTerm = selectedBundle.priceBookName || '';
            this.currencyLocked = true;
            this.closeAllDropdowns();
            this.getProductItems(id);
        }
    }

    
    async getProductItems(Id) {
        this.productItemList = [];
        try {
            const result = await GetProductLineItm({ Id: Id });
            const bundlePriceBookId = result?.[0]?.QuoteForce__Product_Bundle__r?.QuoteForce__Price_Book__c || this.bundlePriceBookId;
            this.bundlePriceBookId = bundlePriceBookId || '';
            await this.loadBundleEntryOptions(this.bundlePriceBookId);

            if (result.length > 0) {
                const orphanRows = result.filter(
                    element => !element.QuoteForce__Price_Book_Entry__c && !element.QuoteForce__Product__c
                );
                const validResults = result.filter(
                    element => element.QuoteForce__Price_Book_Entry__c || element.QuoteForce__Product__c
                );

                if (orphanRows.length > 0) {
                    orphanRows.forEach(row => {
                        deleteProductLineItems({ Id: row.Id }).catch(err => console.error(err));
                    });
                }

                if (validResults.length > 0) {
                    this.productItemList = validResults.map(element => {
                        const quantity = element.QuoteForce__Quantity__c || 0;
                        const price = element.QuoteForce__Price__c || 0;
                        const matchedEntry = element.QuoteForce__Price_Book_Entry__c
                            ? this.bundleEntryOptions.find(o => o.value === element.QuoteForce__Price_Book_Entry__c)
                            : this.bundleEntryOptions.find(o => o.productId === element.QuoteForce__Product__c);

                        const fallbackLabel = element.QuoteForce__Price_Book_Entry__r?.QuoteForce__Product__r?.Name
                            ? (element.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
                                ? `${element.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name} (${element.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c})`
                                : element.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name)
                            : '';

                        const resolvedLabel = matchedEntry?.label || fallbackLabel;

                        return this.buildBundleRowWithOptions({
                            Id: element.Id,
                            Quantity: quantity,
                            Price: price,
                            LineTotal: (price * quantity).toFixed(2),
                            productBundle: element.QuoteForce__Product_Bundle__c,
                            productId: element.QuoteForce__Product__c,
                            priceBookEntryId: element.QuoteForce__Price_Book_Entry__c || matchedEntry?.value || '',
                            priceBookEntryLabel: resolvedLabel,
                            entrySearchTerm: resolvedLabel
                        }, 'existing');
                    });
                } else {
                    this.productItemList = [this.buildBundleRowWithOptions(createBundleItemRow(''), 'existing')];
                }
            } else {
                this.productItemList = [this.buildBundleRowWithOptions(createBundleItemRow(''), 'existing')];
            }
        } catch (error) {
            this.showToast('Error', error.body ? error.body.message : '', 'error');
        }
    }


   addItem() {
    this.productItemList = [
        ...this.productItemList,
        this.buildBundleRowWithOptions(createBundleItemRow(''), 'existing')
    ];
}
   
    addItemInsert() {
        this.productItemListInsert = [
            ...this.productItemListInsert,
            this.buildBundleRowWithOptions(createBundleItemRow(Date.now()), 'insert') 
        ];
        this.updateCurrencyLock();
    }

    deleteItemInsert(event) {
        var rowIndex = Number(event.currentTarget.dataset.index);
        if (this.productItemListInsert.length > 1) {
            this.productItemListInsert = this.productItemListInsert.filter((_, i) => i !== rowIndex);
            this.updateCurrencyLock();
        }
    }

    async deleteItem(event) {
        try {
            if (this.productItemList.length > 1) {
                let rowIndex = Number(event.currentTarget.dataset.index);
                let productLineItemId = this.productItemList[rowIndex]?.Id;
                if (productLineItemId) {
                    const result = await deleteProductLineItems({ Id: productLineItemId });
                    if (result) {
                        this.productItemList = this.productItemList.filter((_, i) => i !== rowIndex);
                    }
                }
            } else {
                this.showToast('Error', 'Minimum One Product required!', 'error');
                return;
            }
        } catch (error) {
            console.log('## in the error: ', JSON.stringify(error));
        }
    }

    
    handleChangeProductItem(event) {
        var rowIndex = Number(event.currentTarget.dataset.index);
        const rows = [...this.productItemListInsert];

        if (event.target.label === 'Price Book Entry') {
            rows[rowIndex] = this.syncBundleRowFromEntry(
                rows[rowIndex],
                event.detail.recordId || event.detail.value,
                'insert' 
            );
        } else if (event.target.label === 'Quantity') {
            const qty = event.target.value;
            rows[rowIndex] = {
                ...rows[rowIndex],
                Quantity: qty,
                LineTotal: (rows[rowIndex].Price * qty).toFixed(2)
            };
        } else if (event.target.label === 'Price') {
            const price = event.target.value;
            rows[rowIndex] = {
                ...rows[rowIndex],
                Price: price,
                LineTotal: (price * rows[rowIndex].Quantity).toFixed(2)
            };
        }

        this.productItemListInsert = rows;
        this.updateCurrencyLock();
    }

    handleDocumentClick() {
        this.closeAllDropdowns();
    }

    handleDropdownContainerClick(event) {
        event.stopPropagation();
    }

    closeAllDropdowns() {
        this.isBundlePriceBookDropdownOpen = false;
        this.isExistingBundlePriceBookDropdownOpen = false;
        this.pricingRows = (this.pricingRows || []).map((row) => ({
            ...row,
            isPriceBookDropdownOpen: false
        }));
        this.productItemList = (this.productItemList || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
        this.productItemListInsert = (this.productItemListInsert || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
    }

    openBundlePriceBookDropdown(event) {
        event.stopPropagation();
        this.isBundlePriceBookDropdownOpen = true;
        this.isExistingBundlePriceBookDropdownOpen = false;
        this.bundlePriceBookSearchTerm = '';
        this.pricingRows = (this.pricingRows || []).map((row) => ({
            ...row,
            isPriceBookDropdownOpen: false
        }));
        this.productItemList = (this.productItemList || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
        this.productItemListInsert = (this.productItemListInsert || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
    }

    openExistingBundlePriceBookDropdown(event) {
        this.cleanupEmptyRows();
        event.stopPropagation();
        this.isExistingBundlePriceBookDropdownOpen = true;
        this.isBundlePriceBookDropdownOpen = false;
        this.existingBundlePriceBookSearchTerm = '';
        this.pricingRows = (this.pricingRows || []).map((row) => ({
            ...row,
            isPriceBookDropdownOpen: false
        }));
        this.productItemList = (this.productItemList || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
        this.productItemListInsert = (this.productItemListInsert || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
    }

    async openBundleEntryDropdown(event) {
        event.stopPropagation();
        if (this.isBundleEntryPickerDisabled) {
            return;
        }

        const btn = event.currentTarget;
        const rect = btn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < 260;

        const rowIndex = Number(btn.dataset.index);
        const listName = btn.dataset.list;
        this.isBundlePriceBookDropdownOpen = false;
        this.isExistingBundlePriceBookDropdownOpen = false;
        this.pricingRows = (this.pricingRows || []).map((row) => ({
            ...row,
            isPriceBookDropdownOpen: false
        }));

        // Refresh entries so newly-active/inactive products reflect immediately
        try {
            await this.loadBundleEntryOptions(this.bundlePriceBookId);
        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        }

        const updateRows = (rows, ln) => rows.map((row, index) => this.buildBundleRowWithOptions({
            ...row,
            entrySearchTerm: index === rowIndex ? '' : row.entrySearchTerm,
            isEntryDropdownOpen: index === rowIndex,
            openAbove: index === rowIndex ? openAbove : false
        }, ln)); 

        if (listName === 'insert') {
            this.productItemListInsert = updateRows(this.productItemListInsert || [], 'insert');
            this.productItemList = (this.productItemList || []).map((row) => ({
                ...row,
                isEntryDropdownOpen: false,
                openAbove: false
            }));
        } else {
            this.productItemList = updateRows(this.productItemList || [], 'existing');
            this.productItemListInsert = (this.productItemListInsert || []).map((row) => ({
                ...row,
                isEntryDropdownOpen: false,
                openAbove: false
            }));
        }
    }

    handleBundlePriceBookSearch(event) {
        this.bundlePriceBookSearchTerm = event.detail?.value ?? event.target.value ?? '';
        this.isBundlePriceBookDropdownOpen = true;
    }

    handleExistingBundlePriceBookSearch(event) {
        this.existingBundlePriceBookSearchTerm = event.detail?.value ?? event.target.value ?? '';
        this.isExistingBundlePriceBookDropdownOpen = true;
    }

    async handleBundlePriceBookOptionSelect(event) {
        const priceBookId = event.currentTarget.dataset.value;
        this.isBundlePriceBookDropdownOpen = false;
        this.bundlePriceBookSearchTerm = '';
        await this.applyBundlePriceBookSelection(priceBookId);
    }

    async handleExistingBundlePriceBookOptionSelect(event) {
        const priceBookId = event.currentTarget.dataset.value;
        this.isExistingBundlePriceBookDropdownOpen = false;
        this.existingBundlePriceBookSearchTerm = '';
        await this.applyExistingBundlePriceBookSelection(priceBookId);
    }

   
    handleBundleEntrySearch(event) {
        var rowIndex = Number(event.currentTarget.dataset.index);
        var listName = event.currentTarget.dataset.list;
        var searchTerm = event.detail?.value ?? event.target.value ?? '';
        const sourceList = listName === 'insert' ? [...this.productItemListInsert] : [...this.productItemList];

        sourceList[rowIndex] = this.buildBundleRowWithOptions({
            ...sourceList[rowIndex],
            entrySearchTerm: searchTerm,
            isEntryDropdownOpen: true
        }, listName); 

        if (listName === 'insert') {
            this.productItemListInsert = sourceList;
        } else {
            this.productItemList = sourceList;
        }
    }

    handleBundleEntryOptionSelect(event) {
    const rowIndex = Number(event.currentTarget.dataset.index);
    const listName = event.currentTarget.dataset.list;
    const entryId = event.currentTarget.dataset.value;

    if (listName === 'insert') {
        const rows = [...this.productItemListInsert];
        rows[rowIndex] = {
            ...this.syncBundleRowFromEntry(rows[rowIndex], entryId, 'insert'),
            entrySearchTerm: '',
            isEntryDropdownOpen: false,
            openAbove: false
        };
        this.productItemListInsert = rows.map(r => this.buildBundleRowWithOptions(r, 'insert'));
        this.updateCurrencyLock();
        return;
    }

    const rows = [...this.productItemList];
    const currentRow = rows[rowIndex];
    const syncedRow = this.syncBundleRowFromEntry(currentRow, entryId, 'existing');

    if (!currentRow.Id) {
        console.log('[handleBundleEntryOptionSelect] New row, inserting to Salesforce first...');
        insertProductLineItmSingle({
            plObj: { 'QuoteForce__Product_Bundle__c': this.selectedProdBundleId }
        })
        .then(result => {
            console.log('[handleBundleEntryOptionSelect] Inserted new line item:', result.Id);
            const updatedRows = [...this.productItemList];
            updatedRows[rowIndex] = this.buildBundleRowWithOptions({
                ...syncedRow,
                Id: result.Id,
                entrySearchTerm: syncedRow.priceBookEntryLabel,
                isEntryDropdownOpen: false,
                openAbove: false
            }, 'existing');
            this.productItemList = updatedRows;

            this.updateProductLineRecords({
                'Id': result.Id,
                'QuoteForce__Price_Book_Entry__c': syncedRow.priceBookEntryId,
                'QuoteForce__Product__c': syncedRow.productId,
                'QuoteForce__Quantity__c': syncedRow.Quantity,
                'QuoteForce__Price__c': syncedRow.Price
            });
        })
        .catch(error => {
            console.error('[handleBundleEntryOptionSelect] Insert failed:', error);
            this.showToast('Error', error.body ? error.body.message : '', 'error');
        });
        return;
    }

    console.log('[handleBundleEntryOptionSelect] Existing row, updating Salesforce. Id:', currentRow.Id);
    rows[rowIndex] = this.buildBundleRowWithOptions({
        ...syncedRow,
        entrySearchTerm: syncedRow.priceBookEntryLabel,
        isEntryDropdownOpen: false,
        openAbove: false
    }, 'existing');
    this.productItemList = rows;

    this.updateProductLineRecords({
        'Id': currentRow.Id,
        'QuoteForce__Price_Book_Entry__c': syncedRow.priceBookEntryId,
        'QuoteForce__Product__c': syncedRow.productId,
        'QuoteForce__Quantity__c': syncedRow.Quantity,
        'QuoteForce__Price__c': syncedRow.Price
    });
}

    openPricingPriceBookDropdown(event) {
        event.stopPropagation();
        const rowId = event.currentTarget.dataset.rowId;
        this.isBundlePriceBookDropdownOpen = false;
        this.isExistingBundlePriceBookDropdownOpen = false;
        this.productItemList = (this.productItemList || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
        this.productItemListInsert = (this.productItemListInsert || []).map((row) => ({
            ...row,
            isEntryDropdownOpen: false
        }));
        this.pricingRows = (this.pricingRows || []).map((row) => this.buildPricingRowWithOptions({
            ...row,
            priceBookSearchTerm: row.id === rowId ? '' : row.priceBookSearchTerm,
            isPriceBookDropdownOpen: row.id === rowId
        }));
    }

    handlePricingPriceBookSearch(event) {
        const rowId = event.target.dataset.rowId;
        const searchTerm = event.detail?.value ?? event.target.value ?? '';

        this.pricingRows = (this.pricingRows || []).map((row) => {
            if (row.id !== rowId) {
                return row;
            }

            return this.buildPricingRowWithOptions({
                ...row,
                priceBookSearchTerm: searchTerm,
                isPriceBookDropdownOpen: true
            });
        });
    }

    handlePricingPriceBookOptionSelect(event) {
        const rowId = event.currentTarget.dataset.rowId;
        const value = event.currentTarget.dataset.value;

        this.handlePricingRowChange({
            target: {
                dataset: {
                    rowId,
                    field: 'priceBookSelection'
                },
                type: 'text',
                value
            },
            detail: {
                value
            }
        });
    }

handleChangeProductLineItem(event) {
    var rowIndex = Number(event.currentTarget.dataset.index);
    const rows = [...this.productItemList];

    if (event.target.label === 'Price Book Entry') {
        rows[rowIndex] = this.syncBundleRowFromEntry(
            rows[rowIndex],
            event.detail.recordId || event.detail.value,
            'existing'
        );
        this.productItemList = rows;
        this.updateProductLineRecords({
            'Id': this.productItemList[rowIndex].Id,
            'QuoteForce__Price_Book_Entry__c': this.productItemList[rowIndex].priceBookEntryId,
            'QuoteForce__Product__c': this.productItemList[rowIndex].productId,
            'QuoteForce__Quantity__c': this.productItemList[rowIndex].Quantity,
            'QuoteForce__Price__c': this.productItemList[rowIndex].Price
        });
    } else if (event.target.label === 'Quantity') {
        const qty = event.target.value;
        console.log('[handleChangeProductLineItem] Quantity change — rowIndex:', rowIndex, '| value:', qty, '| Id:', rows[rowIndex]?.Id);
        rows[rowIndex] = {
            ...rows[rowIndex],
            Quantity: qty,
            LineTotal: (rows[rowIndex].Price * qty).toFixed(2)
        };
        this.productItemList = rows;
        this.updateProductLineRecords({
            'Id': rows[rowIndex].Id,
            'QuoteForce__Quantity__c': qty
        });
    } else if (event.target.label === 'Price') {
        const price = event.target.value;
        console.log('[handleChangeProductLineItem] Price change — rowIndex:', rowIndex, '| value:', price, '| Id:', rows[rowIndex]?.Id);
        rows[rowIndex] = {
            ...rows[rowIndex],
            Price: price,
            LineTotal: (price * rows[rowIndex].Quantity).toFixed(2)
        };
        this.productItemList = rows;
        this.updateProductLineRecords({
            'Id': rows[rowIndex].Id,
            'QuoteForce__Price__c': price
        });
    }
}

    get isImage() {
        if (this.fileData && this.fileData.filename) {
            const extension = this.fileData.filename.split('.').pop().toLowerCase();
            return ['png', 'jpg', 'jpeg'].includes(extension);
        }
        return false;
    }

    isSupportedProductImage(file) {
        if (!file) {
            return false;
        }
        const extension = file.name.split('.').pop()?.toLowerCase();
        return ['png', 'jpg', 'jpeg'].includes(extension);
    }

    handleInvalidProductImage(event) {
        event.target.value = null;
        this.showToast('Error', 'Only JPG, JPEG, and PNG files are allowed.', 'error');
    }

    openfileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (!this.isSupportedProductImage(file)) {
            this.handleInvalidProductImage(event);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            this.previewUrl = reader.result;
            this.fileData = {
                filename: file.name,
                base64: base64,
                recordId: ''
            };
        };

        reader.readAsDataURL(file);
    }

    handleImageRemove() {
        this.previewUrl = '';
    }

    handleClickFileUpload(recordId) {
        if (!this.fileData) return;

        this.fileData.recordId = recordId;
        const { base64, filename, recordId: rid } = this.fileData;

        uploadFile({ base64, filename, recordId: rid })
            .then((result) => {
                this.fileData = null;
                this.imageAvailable = true;
                this.imageUploaded = true;
                this.previewUrl = `/sfc/servlet.shepherd/version/download/${result}`;
                this.productImageUrl = this.previewUrl;
            })
            .catch((error) => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    handleClickDeleteImage() {
        deleteFile({ recordId: this.selectedProdId })
            .then(() => {
                this.previewUrl = null;
                this.productImageUrl = null;
                this.imageAvailable = false;
                this.fileData = null;
            })
            .catch((error) => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    async handelOnClickEditProd(event) {
        this.selectedProdId = event.currentTarget.dataset.id;
        this.editProdBool = true;
        this.resetProductModalStep();

        if (!this.orgDefaultCurrency) {
            await this.loadOrgDefaultCurrency();
        }

        try {
            await this.getProductRecord(this.searchVal);

            const selectedProduct = this.productRecords.find(
                prod => prod.Id === this.selectedProdId
            );

            if (selectedProduct) {
                this.productNameValue = selectedProduct.Name;
                this.ProductCodeValue = selectedProduct.QuoteForce__Product_Code__c;
                this.productDescriptionValue = selectedProduct.QuoteForce__Description__c;
                this.productUPCValue = selectedProduct.QuoteForce__Default_Price__c;
                this.selectedCurrency = selectedProduct.QuoteForce__Currency__c;
                this.productDQValue = selectedProduct.QuoteForce__Default_Quantity__c;
                this.isactive = selectedProduct.QuoteForce__Active__c ? true : false;

                if (selectedProduct.QuoteForce__ContentDocumentLink_Id__c) {
                    this.imageAvailable = true;
                    this.previewUrl = `/sfc/servlet.shepherd/version/download/${selectedProduct.QuoteForce__ContentDocumentLink_Id__c}`;
                    this.productImageUrl = this.previewUrl;
                } else {
                    this.imageAvailable = false;
                    this.previewUrl = null;
                    this.productImageUrl = null;
                }

                this.fileData = null;
                this.imageUploaded = false;
            }

            const entries = await getPriceBookEntriesByProduct({
                productId: this.selectedProdId
            });

            this.buildPricingRowsFromEntries(entries || []);

        } catch (error) {
            this.initializePricingRows();
            this.showToast('Error', this.normalizeError(error), 'error');
            console.error('[handelOnClickEditProd] Edit Load Error:', error);
        }
    }

    async handleOnClickSaveEditProd() {
        console.log('pricingRows:', JSON.stringify(this.pricingRows));
        console.log('selectedCurrency:', this.selectedCurrency);
                if (!this.validateEditProductForm() || !this.validatePricingRows()) {
                    return;
                }
        const matchingRow = this.pricingRows?.find(
            row => row.currency === this.selectedCurrency && !row.isNewPriceBook
        );
        const defaultPrice = matchingRow?.unitPrice;
        if (defaultPrice !== undefined && defaultPrice !== null && defaultPrice !== '') {
            this.productUPCValue = defaultPrice;
        }
        const productObj = {
            Id: this.selectedProdId,
            Name: this.productNameValue.trim(),
            QuoteForce__Product_Code__c: this.ProductCodeValue?.trim(),
            QuoteForce__Description__c: this.productDescriptionValue,
            QuoteForce__Default_Price__c:
                this.productUPCValue === '' || this.productUPCValue === null
                    ? null
                    : Number(this.productUPCValue),
            QuoteForce__Default_Quantity__c: Number(this.productDQValue),
            QuoteForce__Currency__c: this.selectedCurrency,
            QuoteForce__Active__c: this.isactive
        };

        const pricingRows = this.pricingRows.map((row) => ({
            entryId: row.entryId,
            priceBookId: row.isNewPriceBook ? null : row.priceBookId,
            unitPrice: Number(row.unitPrice),
            isActive: row.isActive,
            currencyCode: row.currency,
            draftPriceBook: row.isNewPriceBook
                ? {
                    Name: row.draftPriceBook.Name?.trim(),
                    description: row.draftPriceBook.description,
                    currencyCode: row.draftPriceBook.currencyCode,
                    isActive: row.draftPriceBook.isActive,
                    isDefault: row.draftPriceBook.isDefault
                }
                : null
        }));

        this.loaded = true;

        try {
            await updateProductWithPricing({
                prod_Obj: productObj,
                pricingRows
            });

            this.showToast('Success', 'Product updated successfully!', 'success');
            this.resetForm();
            this.editProdBool = false;
            await this.loadPriceBookOptions();
            await this.getProductRecord(this.searchVal);

        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.loaded = false;
        }
    }

    handelOnClickCancelEditProd() {
        this.editProdBool = false;
        this.resetProductModalStep();
        this.loaded = true;
        setTimeout(() => {
            this.resetForm();
            this.loaded = false;
        }, 3000);
    }

    handelOnClickCancelNewProd() {
        this.NewProdBool = false;
        this.resetProductModalStep();
        this.loaded = true;
        setTimeout(() => {
            this.resetForm();
            this.loaded = false;
        }, 3000);
    }

    resetForm() {
        this.productNameValue = '';
        this.ProductCodeValue = '';
        this.productDescriptionValue = '';
        this.productUPCValue = '';
        this.isactive = false;
        this.fileData = null;
        this.previewUrl = null;
        this.imageAvailable = false;
        this.productImageUrl = null;
        this.selectedProdId = '';
        this.imageUploaded = false;
        this.productDQValue = 1;
        this.resetProductModalStep();
        this.initializePricingRows();
    }

    handleImageDelete() {
        this.previewUrl = null;
        this.fileData = null;
        this.imageUploaded = false;
        this.productImageUrl = null;
        this.imageAvailable = false;

        if (this.selectedProdId) {
            deleteFile({ recordId: this.selectedProdId })
                .then(() => {})
                .catch(error => {
                    this.showToast('Error', error.body.message, 'error');
                });
        }
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (!this.isSupportedProductImage(file)) {
            this.handleInvalidProductImage(event);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            let base64 = reader.result.split(',')[1];
            uploadFileToProduct({
                productId: this.selectedProdId,
                base64Data: base64,
                fileName: file.name
            })
                .then(result => {
                    this.imageAvailable = true;
                    const servletUrl = '/sfc/servlet.shepherd/version/download/' + result;
                    this.productImageUrl = servletUrl;
                    this.imageAvailable = true;
                })
                .catch(error => {
                    console.error(error);
                    this.showToast('Error', error, 'error');
                });
        };

        reader.readAsDataURL(file);
    }

    

    deleteProductBundle(event) {
        let Id = event.currentTarget.dataset.id;
        this.selectedProdBundleId = Id;
        this.deleteProductBundleModal = true;
    }

    deleteProductBundleCancel() {
        this.deleteProductBundleModal = false;
    }

    handleClickOnDeleteProductBundle() {
        deleteProductBundle({ Id: this.selectedProdBundleId })
            .then(result => {
                this.getProductRecordBundle(this.searchValBundle);
                this.deleteProductBundleCancel();
                this.showToast('Success', 'Product bundle deleted successfully!', 'success');
            })
            .catch(error => {
                this.showToast('Error', error.body ? error.body.message : '', 'error');
            });
    }

   handlePriceInput(event) {
    let value = event.target.value;
    const id = event.target.dataset.id;

    if (value && value.replace('.', '').length >= 6) {
        event.target.setCustomValidity('Only 6 digits are allowed');
        if (value.replace('.', '').length > 6) {
            value = value.slice(0, 6 + (value.includes('.') ? 1 : 0));
            event.target.value = value;
        }
    } else {
        event.target.setCustomValidity('');
    }
    event.target.reportValidity();

    this.productRecords = this.productRecords.map(prod => {
        if (prod.Id !== id) {
            return prod;
        }
        return {
            ...prod,
            QuoteForce__Default_Price__c: value,
            defaultPriceLabel: `${prod.currencySymbol}${value}`
        };
    });
}

    

    openImportProductsModal() {
        this.isImportProductsModalOpen = true;
    }

    closeImportProductsModal() {
        this.isImportProductsModalOpen = false;
        this.getProductRecord(this.searchVal);
    }

    openImportProductsBundleModal() {
        this.isImportProductsBundleModalOpen = true;
    }

    closeImportProductsBundleModal() {
        this.isImportProductsBundleModalOpen = false;
        this.getProductRecord(this.searchVal);
        this.getProductRecordBundle(this.searchValBundle);
    }

    

    currencyOptions = [
        { label: '($) USD', value: 'USD' },
        { label: '(₹) INR', value: 'INR' },
        { label: '(€) EUR', value: 'EUR' },
        { label: '(£) GBP', value: 'GBP' }
    ];

    handleCurrencyChange(event) {
        this.selectedCurrency = event.detail.value;
        this.pricingRows = this.pricingRows.map((row) => {
            if (row.priceBookId) {
                return row;
            }

            const draftPriceBook = {
                ...row.draftPriceBook,
                currencyCode: row.isNewPriceBook ? row.draftPriceBook.currencyCode : this.selectedCurrency
            };

            return {
                ...row,
                currency: row.isNewPriceBook ? row.currency : this.selectedCurrency,
                draftPriceBook
            };
        });
    }

    currencySymbols = {
        USD: '$',
        INR: '₹',
        EUR: '€',
        GBP: '£'
    };

    get currencySymbol() {
        return this.currencySymbols[this.selectedCurrency] || '$';
    }

    

    handleCurrencyFilter(event) {
        this.currencyFilter = event.detail.value;
        this.currentPage = 1;
        this.getProductRecord(this.searchVal);
    }

    

    handleBundleCurrencyFilter(event) {
        this.bundleCurrencyFilter = event.detail.value;
        this.getProductRecordBundle(this.searchValBundle);
    }

    currencyOptionsSearch = [
        { label: 'All', value: '' },
        { label: '($) USD', value: 'USD' },
        { label: '(₹) INR', value: 'INR' },
        { label: '(€) EUR', value: 'EUR' },
        { label: '(£) GBP', value: 'GBP' }
    ];

    async handleBundlePriceBookChange(event) {
        await this.applyBundlePriceBookSelection(event.detail.recordId || event.detail.value);
    }

    async applyBundlePriceBookSelection(priceBookId) {
        this.bundlePriceBookId = priceBookId;
        const selectedPriceBook = this.bundlePriceBookOptions.find((option) => option.value === this.bundlePriceBookId);
        this.bundleCurrency = selectedPriceBook?.currencyCode || '';
        this.selectedCurrency = selectedPriceBook?.currencyCode || 'USD';
        this.bundlePriceBookSearchTerm = '';
        await this.loadBundleEntryOptions(this.bundlePriceBookId);
        this.resetBundleInsertRows();
        this.updateCurrencyLock();
    }

    async handleExistingBundlePriceBookChange(event) {
        await this.applyExistingBundlePriceBookSelection(event.detail.recordId || event.detail.value);
    }

    async applyExistingBundlePriceBookSelection(priceBookId) {
        const selectedPriceBook = this.bundlePriceBookOptions.find((option) => option.value === priceBookId);

        this.loaded = true;
        try {
            await updateProductBundle({
                prod_Bundle_Obj: {
                    Id: this.selectedProdBundleId,
                    QuoteForce__Price_Book__c: priceBookId,
                    QuoteForce__Currency__c: selectedPriceBook?.currencyCode || null
                }
            });
            this.bundlePriceBookId = priceBookId;
            this.bundleCurrency = selectedPriceBook?.currencyCode || '';
            this.existingBundlePriceBookSearchTerm = '';

            this.productBundleRecords = (this.productBundleRecords || []).map((bundle) => (
                bundle.bundleId === this.selectedProdBundleId
                    ? {
                        ...bundle,
                        priceBookId,
                        priceBookName: selectedPriceBook?.name || selectedPriceBook?.label || '',
                        currencyCode: selectedPriceBook?.currencyCode || ''
                    }
                    : bundle
            ));

            await this.loadBundleEntryOptions(priceBookId);

            const emptyRowsPB = this.productItemList.filter(
                (item) => !item.priceBookEntryId && item.Id
            );
            emptyRowsPB.forEach(row => {
                deleteProductLineItems({ Id: row.Id }).catch(err => console.error(err));
            });

            this.productItemList = [];
            await this.getProductItems(this.selectedProdBundleId);

        } catch (error) {
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.loaded = false;
        }
    }

    get hasSelectedInsertProducts() {
        return (this.productItemListInsert || []).some(item => !!item.productId);
    }

    updateCurrencyLock() {
        this.currencyLocked = this.hasSelectedInsertProducts;
    }

    get bundleTotal() {
        let total = 0;
        this.productItemList.forEach(item => {
            total += Number(item.LineTotal || 0);
        });
        return total.toFixed(2);
    }

    async handleOnClickSaveNewProd() {
        console.log('pricingRows:', JSON.stringify(this.pricingRows));
        console.log('selectedCurrency:', this.selectedCurrency);
                if (!this.validateNewProductForm() || !this.validatePricingRows()) {
                    return;
                }

            const matchingRow = this.pricingRows?.find(
            row => row.currency === this.selectedCurrency && !row.isNewPriceBook
        );
        const defaultPrice = matchingRow?.unitPrice;
        if (defaultPrice !== undefined && defaultPrice !== null && defaultPrice !== '') {
            this.productUPCValue = defaultPrice;
        }

        const productObj = {
            Name: this.productNameValue.trim(),
            QuoteForce__Product_Code__c: this.ProductCodeValue?.trim(),
            QuoteForce__Description__c: this.productDescriptionValue,
            QuoteForce__Default_Price__c:
                this.productUPCValue === '' || this.productUPCValue === null
                    ? null
                    : Number(this.productUPCValue),
            QuoteForce__Default_Quantity__c: Number(this.productDQValue),
            QuoteForce__Currency__c: this.selectedCurrency,
            QuoteForce__Active__c: this.isactive
        };

        const pricingRows = this.pricingRows.map((row) => ({
            priceBookId: row.isNewPriceBook ? null : row.priceBookId,
            unitPrice: Number(row.unitPrice),
            isActive: row.isActive,
            currencyCode: row.currency,
            draftPriceBook: row.isNewPriceBook
                ? {
                    Name: row.draftPriceBook.Name?.trim(),
                    description: row.draftPriceBook.description,
                    currencyCode: row.draftPriceBook.currencyCode,
                    isActive: row.draftPriceBook.isActive,
                    isDefault: row.draftPriceBook.isDefault
                }
                : null
        }));

        this.loaded = true;
        try {
            const result = await createProductWithPricing({
                prod_Obj: productObj,
                pricingRows
            });

            const createdProductId = result?.productRecord?.Id;
            if (this.fileData && createdProductId) {
                this.handleClickFileUpload(createdProductId);
            }

            this.showToast('Success', 'Product and pricing created successfully!', 'success');
            this.resetForm();
            this.NewProdBool = false;
            await this.loadPriceBookOptions();
            this.getProductRecord(this.searchVal);
        } catch (error) {
            console.error('[handleOnClickSaveNewProd] Apex error:', JSON.stringify(error));
            this.showToast('Error', this.normalizeError(error), 'error');
        } finally {
            this.loaded = false;
        }
    }

    validateNewProductForm() {
        if (!this.productDQValue || Number(this.productDQValue) < 1) {
            this.showToast('Error', 'Default quantity must be greater than or equal to 1', 'error');
            return false;
        }

        if (!this.productNameValue || this.productNameValue.trim() === '') {
            this.showToast('Error', 'Please enter a product name', 'error');
            return false;
        }

        if (!this.ProductCodeValue || this.ProductCodeValue.trim() === '') {
            this.showToast('Error', 'Product code is required.', 'error');
            return false;
        }

        if (this.productUPCValue !== '' && this.productUPCValue !== null && Number(this.productUPCValue) < 0) {
            this.showToast('Error', 'Default price must be greater than or equal to 0.', 'error');
            return false;
        }

        const normalizedCode = this.ProductCodeValue.trim();
        const isDuplicate = this.productRecords?.some(
            (rec) => rec.QuoteForce__Product_Code__c === normalizedCode && rec.QuoteForce__Currency__c === this.selectedCurrency
        );

        if (isDuplicate) {
            this.showToast('Error', 'Product with same code and currency already exists', 'error');
            return false;
        }

        return true;
    }

    validateEditProductForm() {
        if (!this.productDQValue || Number(this.productDQValue) < 1) {
            this.showToast('Error', 'Default quantity must be greater than or equal to 1', 'error');
            return false;
        }

        if (!this.productNameValue || this.productNameValue.trim() === '') {
            this.showToast('Error', 'Please enter a product name', 'error');
            return false;
        }

        if (!this.ProductCodeValue || this.ProductCodeValue.trim() === '') {
            this.showToast('Error', 'Product code is required.', 'error');
            return false;
        }

        if (this.productUPCValue !== '' && this.productUPCValue !== null && Number(this.productUPCValue) < 0) {
            this.showToast('Error', 'Default price must be greater than or equal to 0.', 'error');
            return false;
        }

        const normalizedCode = this.ProductCodeValue.trim();
        const isDuplicate = this.productRecords?.some(
            (rec) =>
                rec.Id !== this.selectedProdId &&
                rec.QuoteForce__Product_Code__c === normalizedCode &&
                rec.QuoteForce__Currency__c === this.selectedCurrency
        );

        if (isDuplicate) {
            this.showToast('Error', 'Product with same code and currency already exists', 'error');
            return false;
        }

        return true;
    }

    validatePricingRows() {
        if (!this.pricingRows.length) {
            this.showToast('Error', 'At least one PriceBook entry is required.', 'error');
            return false;
        }

        if (this.orgDefaultCurrency) {
            const hasDefaultCurrencyRow = this.pricingRows.some((r) => {
                const rowCurrency = r.isNewPriceBook
                    ? normalizeCurrencyCode(r.draftPriceBook?.currencyCode)
                    : normalizeCurrencyCode(r.currency);
                return rowCurrency === this.orgDefaultCurrency;
            });

            if (!hasDefaultCurrencyRow) {
                this.showToast(
                    'Error',
                    `Please select or create a PriceBook for the default currency (${this.orgDefaultCurrency}).`,
                    'error'
                );
                return false;
            }
        }

        const duplicateKeys = new Set();
        let defaultDraftCount = 0;

        for (const row of this.pricingRows) {
            if (!row.priceBookSelection) {
                this.showToast('Error', 'Each pricing row must select a PriceBook.', 'error');
                return false;
            }

            if (row.unitPrice === null || row.unitPrice === '' || Number(row.unitPrice) <= 0) {
                this.showToast('Error', 'Unit price must be greater than 0.', 'error');
                return false;
            }

            if (row.isNewPriceBook) {
                const draftName = row.draftPriceBook.Name?.trim();
                if (!draftName) {
                    this.showToast('Error', 'PriceBook Name is required for new PriceBooks.', 'error');
                    return false;
                }

                const nameAlreadyExists = this.priceBookOptions.some(
                    (option) => option.name?.toLowerCase() === draftName.toLowerCase()
                );
                if (nameAlreadyExists) {
                    this.showToast('Error', 'PriceBook name must be unique.', 'error');
                    return false;
                }

                if (!row.draftPriceBook.currencyCode) {
                    this.showToast('Error', 'PriceBook currency is required.', 'error');
                    return false;
                }

                if (draftName.toLowerCase().includes(row.draftPriceBook.currencyCode.toLowerCase())) {
                    this.showToast('Error', `PriceBook name cannot contain the currency code "${row.draftPriceBook.currencyCode}".`, 'error');
                    return false;
                }

                if (row.draftPriceBook.isDefault && !row.draftPriceBook.isActive) {
                    this.showToast('Error', 'Default PriceBook must be active.', 'error');
                    return false;
                }

                if (row.draftPriceBook.isDefault) {
                    defaultDraftCount += 1;
                }

                const duplicateKey = `draft:${draftName.toLowerCase()}`;
                if (duplicateKeys.has(duplicateKey)) {
                    this.showToast('Error', 'The same PriceBook cannot appear twice for the same product.', 'error');
                    return false;
                }
                duplicateKeys.add(duplicateKey);
            } else {
                const duplicateKey = `existing:${row.priceBookId}`;
                if (duplicateKeys.has(duplicateKey)) {
                    this.showToast('Error', 'The same PriceBook cannot appear twice for the same product.', 'error');
                    return false;
                }
                duplicateKeys.add(duplicateKey);
            }
        }

        if (defaultDraftCount > 1) {
            this.showToast('Error', 'Only one new PriceBook can be marked as default.', 'error');
            return false;
        }

        return true;
    }

    normalizeError(error) {
        if (error?.body?.message) {
            return error.body.message;
        }
        if (error?.body?.pageErrors?.length) {
            return error.body.pageErrors[0].message;
        }
        if (error?.body?.fieldErrors) {
            const fieldErrorGroups = Object.values(error.body.fieldErrors);
            if (fieldErrorGroups.length && fieldErrorGroups[0].length) {
                return fieldErrorGroups[0][0].message;
            }
        }
        return error?.message || 'Something went wrong';
    }

    cleanupEmptyRows() {
        const emptyRows = this.productItemList.filter(
            (item) => !item.priceBookEntryId && item.Id
        );
        emptyRows.forEach(row => {
            deleteProductLineItems({ Id: row.Id }).catch(err => console.error(err));
        });
    }

    handleRemovePricingRowConfirm(event) {
        this._pendingRemoveRowId = event.currentTarget.dataset.rowId;
        this.isShowRemovePricingRowModal = true;
    }

    hideRemovePricingRowModal() {
        this.isShowRemovePricingRowModal = false;
        this._pendingRemoveRowId = null;
    }

    handleRemovePricingRowConfirmed() {
        this.isShowRemovePricingRowModal = false;
        const rowId = this._pendingRemoveRowId;
        this._pendingRemoveRowId = null;
        const remainingRows = this.pricingRows.filter((row) => row.id !== rowId);
        this.pricingRows = remainingRows.length > 0
            ? remainingRows
            : [this.buildPricingRowWithOptions(createPricingRow(++this.pricingRowSequence, this.selectedCurrency))];
    }
}