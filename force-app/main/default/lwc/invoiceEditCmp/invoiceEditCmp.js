import { LightningElement, track, api, wire } from 'lwc';
import CreateMasterLayout from '@salesforce/apex/InvoiceLineItemController.CreateMasterLayout';
import CreateCustomPage from '@salesforce/apex/InvoiceLineItemController.CreateCustomPage';
import updateCustomPage from '@salesforce/apex/InvoiceLineItemController.updateCustomPage';
import uploadBulkFiles from '@salesforce/apex/InvoiceLineItemController.uploadBulkFiles';
import getLayoutRecord from '@salesforce/apex/InvoiceLineItemController.getLayoutRecord';
import updateInvoiceDetails from '@salesforce/apex/InvoiceLineItemController.updateInvoiceDetails';
import getCustomPageInvoice from '@salesforce/apex/InvoiceLineItemController.getCustomPageInvoice';
import UpdateMasterLayout from '@salesforce/apex/InvoiceLineItemController.UpdateMasterLayout';
import deleteFile from '@salesforce/apex/InvoiceLineItemController.deleteFile';
import deleteLayoutPage from '@salesforce/apex/InvoiceLineItemController.deleteLayoutPage';
import deleteQuoteFile from '@salesforce/apex/InvoiceLineItemController.deleteQuoteFile';
import uploadFile from '@salesforce/apex/InvoiceLineItemController.uploadFileQuote';
import getLayouts from '@salesforce/apex/InvoiceLineItemController.getLayouts';
import getInvoiceDetails from '@salesforce/apex/InvoiceLineItemController.getInvoiceDetails';
import attachDocsToQuote from '@salesforce/apex/InvoiceLineItemController.attachDocsToQuote';
import getQuoteDocumentLinks from '@salesforce/apex/InvoiceLineItemController.getQuoteDocumentLinks';
import SectionUpdate from '@salesforce/apex/ProductConfigurationController.SectionUpdate';
import SectionDeleteCancel from '@salesforce/apex/ProductConfigurationController.SectionDeleteCancel';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';

import saveImageUrl from '@salesforce/apex/InvoiceLineItemController.saveImageUrl';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
export default class QuotesEditCmp extends LightningElement {


    //@api isEditMode = false;

    apiName(name) {
        return name;
    }

    // to get the uploaded document URL
    @track uploadedDocUrls = {
        primaryDocUrl: undefined,
        secondaryDocUrl: undefined,
        warrantyDocUrl: undefined,
        termConditionDocUrl: undefined,
        customPageDocUrl: undefined
    }

    @track uploadedDocumentList = [];

    @track isDocAvailable = {
        primaryImageAvl: false,
        secondaryImageAvl: false,
        warrantyImageAvl: false,
        termConditionImageAvl: false,
        customPageImageAvl: false
    }

    @track contentDocId = {
        primaryDocId: undefined,
        secondaryDocId: undefined,
        warrantyDocId: undefined,
        termConDocId: undefined,
        customPageDocId: undefined
    }

    @track ElementList = [
        {
            Id: 1,
            Name: 'Title',
            label: 'Title',
            selected: true,
            editMode: false,
            toggle: false
        },
        {
            Id: 2,
            Name: 'Letter from the owner',
            label: 'Letter from the owner',
            selected: false,
            editMode: false,
            toggle: false
        },
        {
            Id: 3,
            Name: 'Quote Details',
            label: 'Quote Details',
            selected: false,
            editMode: false,
            toggle: false
        },
        {
            Id: 4,
            Name: 'Warranty',
            label: 'Warranty',
            selected: false,
            editMode: false,
            toggle: false
        },
        {
            Id: 5,
            Name: 'Terms and Conditions',
            label: 'Terms and Conditions',
            selected: false,
            editMode: false,
            toggle: false
        }
    ];

    editCustomPageName = false;
    titleViewPageModel = false;
    LetterFromTheOwnerModel = false;
    QuoteDetailModel = false;
    primaryImage;
    clickCount = 0;
    secondaryImage;
    fileDataPrimary;
    currentSelectedCustomPage = {};
    currentCustomPageRecordId = '';
    fileTypes = ['.jpg', '.png', '.jpeg'];
    loaded = false;

    @track dataPageName = 'Title';
    @api templateId;
    @api CreatedDate;
    @api recordId;
    _invoiceId;
    _invoiceLoadToken = 0;
    _loadedInvoiceId = '';
    @api
    get invoiceId() {
        return this._invoiceId;
    }
    set invoiceId(value) {
        this._invoiceId = value;
        this.maybeLoadInvoiceDetails();
    }
    @api mode;
    @api isFromQuote = false;
    @track cDate;
    @track layout__Name;
    @track pageLabel = '';
    @track loaded = false;
    @track sourceQuoteId = '';
    @track titlePageSelected = true;
    @track latterFormTheOwnerPageSelected = false;
    @track quoteDetailPageSelected = false;
    @track WarrantyPageSelected = false;
    @track TermsAndConditionPageSelected = false;
    @track customePage = false;
    @track fieldValues = {};
    @track letterForm = '';
    @track zipCode = '';
    @track stateProvince = '';
    @track city = '';
    @track streetAddress = '';
    @track lastName = '';
    @track firstName = '';
    @track CreatedDate = '';
    @track primaryImage = '';
    @track secondaryImage = '';
    @track PrimaryUploadedFilesUrl = [];
    @track reportType;
    @track CreatedDate;
    @track contactId;
    @track FirstName;
    @track LastName;
    @track Street_Address;
    @track City;
    @track State;
    @track Zip;
    @track wiredLayoutsResult;
    @track editBoolPages = false;
    @track valLetterFromTheOwner = 'letter from the owner';
    @track valTitle = 'Title';
    @track myVal = 'Initial rich text content';
    @track valQuoteDetails = 'QuoteDetails';
    @track InspectionImagesList = [];
    @track isInsert = false;
    warrantyUrl = '';
    termAndConditionUrl = '';
    @track priceBookId = '';
    @track priceBookOptions = [];

    connectedCallback() {
        this.loaded = true;
        console.log('mode : ', this.mode);
        console.log('this.recordId--- : ', this.recordId);
        console.log('this.invoiceId : ', this.invoiceId);

        this.loadPriceBookOptions();
        this.maybeLoadInvoiceDetails();
    }

    maybeLoadInvoiceDetails() {
        const invoiceId = this.invoiceId;
        if (!invoiceId) return;

        // Avoid duplicate loads for the same invoice when connectedCallback fires after setter.
        if (this._loadedInvoiceId === invoiceId && this._invoiceLoadToken > 0) return;

        this._loadedInvoiceId = invoiceId;
        const requestId = ++this._invoiceLoadToken;
        this.getQuoteDetailsFromApex({ requestId, invoiceId });
    }


    async getQuoteDetailsFromApex({ requestId, invoiceId } = {}) {
        const effectiveInvoiceId = invoiceId ?? this.invoiceId;
        if (!effectiveInvoiceId) return;

        this.loaded = true;
        try {
            const result = await getInvoiceDetails({ recordId: effectiveInvoiceId });

            // Prevent stale state: ignore out-of-order responses.
            if (requestId !== undefined && requestId !== this._invoiceLoadToken) return;
            if (effectiveInvoiceId !== this.invoiceId) return;

            console.log('Invoice details from child lwc----- :', JSON.stringify(result));
            if (result) {
                this.firstName = result.QuoteForce__First_Name__c;
                this.lastName = result.QuoteForce__Last_Name__c;
                this.streetAddress = result.QuoteForce__Street_Address__c;
                this.city = result.QuoteForce__City__c;
                this.stateProvince = result.QuoteForce__State_Province__c;
                this.zipCode = result.QuoteForce__Zip_code_Postal_code__c;
                this.CreatedDate = result.QuoteForce__Date__c;
                this.reportType = result.reportType;
                this.letterForm = result.QuoteForce__Letter_from_the_owner__c;
                this.priceBookId = result.QuoteForce__Price_Book__c || '';
                this.warrantyUrl = result.QuoteForce__Warranty__c;
                this.termAndConditionUrl = result.QuoteForce__Terms_Conditions__c;
                this.layout__Name = result.QuoteForce__Layout_Name__c;
                this.sourceQuoteId = result.QuoteForce__Quotes__c || result.QuoteForce__Quotes_Name__c;
                this.primaryImageUrl = result.QuoteForce__Primary_Image__c;
                this.secondaryImageUrl = result.QuoteForce__Secondary_Image__c;

                // Safe parse for bad/empty Pages_JSON__c.
                const pagesJson = result.QuoteForce__Pages_JSON__c;
                let parsedPages = null;
                if (pagesJson) {
                    try {
                        parsedPages = JSON.parse(pagesJson);
                    } catch (e) {
                        console.error('Failed to parse QuoteForce__Pages_JSON__c:', e);
                        this.showToast('Error', 'Failed to load invoice pages configuration.', 'error');
                    }
                }

                // Only override ElementList if we got a non-empty array; otherwise keep safe defaults.
                if (Array.isArray(parsedPages) && parsedPages.length > 0) {
                    this.ElementList = parsedPages;
                }

                if (Array.isArray(this.ElementList) && this.ElementList.length > 0) {
                    this.ElementList.forEach((section) => {
                        if (section.label == 'Title') {
                            section.selected = true;
                            this.pageLabel = section.label;
                        } else {
                            section.selected = false;
                        }
                    });
                    this.dataPageName = this.ElementList[0]?.Name || 'Title';
                } else {
                    this.dataPageName = 'Title';
                }
            }
        } catch (error) {
            console.error('Error fetching invoice details:', JSON.stringify(error));
            this.showToast('Error', 'Failed to fetch invoice details.', 'error');
        } finally {
            if (
                (requestId === undefined || requestId === this._invoiceLoadToken) &&
                effectiveInvoiceId === this.invoiceId
            ) {
                this.loaded = false;
            }
        }
    }


    @wire(getLayouts)
    wiredLayouts(result) {
        this.wiredLayoutsResult = result;
        if (result.data) {
            this.layouts = result.data;
            this.hasError = false;
        } else if (result.error) {
            this.hasError = true;
            this.showToast('Error', 'Failed to load layouts', 'error');
        }
    }

    @api
    async refreshLayouts() {
        try {
            await refreshApex(this.wiredLayoutsResult);
        } catch (error) {
            this.showToast('Error', 'Failed to refresh layout list', 'error');
        }
    }

    handleAddCustomPage(event) {
        this.clickCount++;

        let customObj = {
            'Name': `Custom Page`,
            'QuoteForce__label__c': `Custom Page ${this.clickCount}`,
            'QuoteForce__selected__c': false,
            'QuoteForce__editMode__c': false,
            'QuoteForce__toggle__c': false,
            'QuoteForce__Quotes__c': this.sourceQuoteId || null,
            'QuoteForce__Invoice__c': this.invoiceId
        };

        CreateCustomPage({ customObj: customObj })
            .then(result => {
                let newElement = {
                    Id: result.Id,
                    Name: `Custom Page`,
                    label: `Custom Page ${this.clickCount}`,
                    selected: false,
                    editMode: false,
                    toggle: false
                };
                getCustomPageInvoice({ recordId: this.invoiceId })
                    .then(result => {
                        console.log('## 2. custom page result: ', result);
                        result.forEach(element => {
                            if (element.Id == this.currentCustomPageRecordId) {
                                this.ctmPgType = element.QuoteForce__Type__c;
                                console.log('## element type: ', element.QuoteForce__Type__c);
                                if (element.QuoteForce__Type__c === 'Upload File') {
                                    this.customPageUploadFile = true;
                                    this.customPageTextPage = false;
                                } else if (element.QuoteForce__Type__c === 'Text Page') {
                                    this.customPageUploadFile = false;
                                    this.customPageTextPage = true;
                                } else {
                                    this.customPageUploadFile = false;
                                    this.customPageTextPage = false;
                                }
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error loading layouts:', error);
                    });
                this.ElementList.push(newElement);
            })
            .catch(error => {
                this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
            });
    }

    handleChangeToggle(event) {
        this.loaded = true;
        var dataLabel = event.currentTarget.dataset.label;
        this.ElementList.forEach(result => {
            if (result.label === dataLabel) {
                result.toggle = event.target.checked;
                this.loaded = false;
            }
        })
        this.pageLabel = dataLabel;
    }


    handleClickPages(event) {
        let dataLabel = event.currentTarget.dataset.label;
        this.dataPageName = event.currentTarget.dataset.page;
        this.currentCustomPageRecordId = event.currentTarget.dataset.recid;

        this.toggleLabel = event.currentTarget.dataset.label;
        this.titlePageSelected = (dataLabel == 'Title') ? true : false;
        this.latterFormTheOwnerPageSelected = (dataLabel == 'Letter from the owner') ? true : false;
        this.quoteDetailPageSelected = (dataLabel == 'Quote Details') ? true : false;
        this.WarrantyPageSelected = (dataLabel == 'Warranty') ? true : false;
        this.TermsAndConditionPageSelected = (dataLabel == 'Terms and Conditions') ? true : false;
        this.customePage = dataLabel.includes("Custom Page") ? true : false;

        this.ElementList.forEach(result => {
            if (result.label == dataLabel) {
                result.selected = true;
                this.pageLabel = result.label;
            } else {
                result.selected = false;
            }
        });

        if (this.quoteDetailPageSelected == true) {
            const childCmp = this.template.querySelector('c-quote-edit-detail-cmp');
            if (childCmp) {
                childCmp.loadSectionData();
            }
        }

        console.log('OUTPUT : ', JSON.stringify(dataLabel));

        if (JSON.stringify(dataLabel).includes("Custom Page")) {
            getCustomPageInvoice({ recordId: this.invoiceId })
                .then(result => {
                    console.log('## 2. custom page result: ', result);
                    result.forEach(element => {
                        if (element.Id == this.currentCustomPageRecordId) {
                            this.ctmPgType = element.QuoteForce__Type__c;
                            console.log('## element type: ', element.QuoteForce__Type__c);
                            if (element.QuoteForce__Type__c === 'Upload File') {
                                this.customPageUploadFile = true;
                                this.customPageTextPage = false;
                            } else if (element.QuoteForce__Type__c === 'Text Page') {
                                this.customPageUploadFile = false;
                                this.customPageTextPage = true;
                            } else {
                                this.customPageUploadFile = false;
                                this.customPageTextPage = false;
                            }
                        }
                    });
                })
                .catch(error => {
                    console.error('Error loading layouts:', error);
                });
        }

        // finding the data of the selected page
        this.currentSelectedCustomPage = this.ElementList.find(ele => ele.Id === this.currentCustomPageRecordId);

        if (this.currentSelectedCustomPage) {
            const ele = this.currentSelectedCustomPage;
            const imageUrl = ele.customPageDocUrl;
            const imageTitle = ele?.ContentDocument?.Title;
            const conDoctId = ele?.ContentDocumentId;

            if (imageTitle === 'customPageDoc') {
                ele.customPageDocUrl = imageUrl;
                ele.customPageImageAvl = true;
            }
        }

        console.log('## page value: ', JSON.stringify(this.currentSelectedCustomPage));
    }

    handleInputFieldsChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    loadPriceBookOptions() {
        listPriceBooks({ searchKey: '', currencyFilter: '', activeOnly: true })
            .then(result => {
                this.priceBookOptions = (result || []).map(record => ({
                    label: record.QuoteForce__Currency__c ? `${record.Name} (${record.QuoteForce__Currency__c})` : record.Name,
                    value: record.Id
                }));
            })
            .catch(error => {
                console.error('Price book load failed', error);
            });
    }

    handleDateFieldsChange(event) {
        this.CreatedDate = event.target.value;
    }

    handleRichInputFieldsChange(event) {
        this.letterForm = event.target.value;
        console.log('letterForm : ', this.letterForm);
    }


    @api
    async updateQuote(newQuoteId) {
        const targetId = newQuoteId ? newQuoteId : this.invoiceId;

        try {
            await updateInvoiceDetails({
                quoteId: targetId,
                firstName: this.firstName,
                lastName: this.lastName,
                streetAddress: this.streetAddress,
                city: this.city,
                stateProvince: this.stateProvince,
                zipCode: this.zipCode,
                CreatedDate: this.CreatedDate,
                layoutName: this.layout__Name,
                letterForm: this.letterForm,
                pagesJSON: JSON.stringify(this.ElementList),
                priceBookId: this.priceBookId || null
            });
            this.showToast('Success', 'Saved successfully!', 'success');
            return targetId;
        } catch (error) {
            console.error('Error', error);
            this.showToast('Error', 'Save failed', 'error');
            throw error;
        }
    }

    handleChangeContact(event) {
        this.contactId = event.target.value;
    }

    @api
    async refreshLinePricing() {
        const lineEditor = this.template.querySelector('c-quote-edit-detail-cmp');
        if (lineEditor?.loadSectionData) {
            await lineEditor.loadSectionData();
        }
    }

    handleClickEditIcon() {
        this.editBoolPages = true;
    }

    handleChangePagesName(event) {
        var lab = event.target.label;
        this.dataPageName = event.target.value;
        console.log('Label On Change  - - - - :', lab);
        this.ElementList.forEach(item => {
            if (event.target.label === item.label) {
                item.Name = event.target.value;
            }
        });

        if (event.target.label === 'Letter from the owner') {
            this.valLetterFromTheOwner = event.target.value;
        } else if (event.target.label === 'QuoteDetails') {
            this.valAuthorizationPage = event.target.value;
        } else if (event.target.label === 'QuoteDetails') {
            this.valQuoteDetails = event.target.value;
        } else if (event.target.label === 'Warranty') {
            this.valWarranty = event.target.value;
        } else if (event.target.label === 'Title') {
            this.valTitle = event.target.value;
        }
    }


    handleSavePagesName() {
        this.editBoolPages = false;
    }

    handleTitleViewPageClick() {
        this.titleViewPageModel = true;
    }
    handleLaterFromOwnerClick() {
        this.LetterFromTheOwnerModel = true;
    }
    handleQuoteDetailsClick() {
        this.QuoteDetailModel = true;
    }

    closeModal() {
        if (this.titleViewPageModel == true) {
            this.titleViewPageModel = false;
        }
        if (this.LetterFromTheOwnerModel == true) {
            this.LetterFromTheOwnerModel = false;
        }
        if (this.QuoteDetailModel == true) {
            this.QuoteDetailModel = false;
        }
        if (this.sqrc == true) {
            this.sqrc = false;
        }
        if (this.warrantyModalBool == true) {
            this.warrantyModalBool = false;
        }
        if (this.GLCertificatePreviewModel == true) {
            this.GLCertificatePreviewModel = false;
        }
        if (this.hearthModePreview == true) {
            this.hearthModePreview = false;
        }
        if (this.HVAC_ModePreview == true) {
            this.HVAC_ModePreview = false;
        }
        this.ConfirmationIsShowModal = false;
        this.isShowViewModal = false;
        this.isShowDeleteModal = false;
        this.isShowViewModalPDF = false;

        SectionDeleteCancel()
            .then(data => {
                console.log('data : ', data);
            })
            .catch(err => {
                console.error('[loadSectionData] Error:', err);
            });
    }


    handleInspectionViewPageClick() {
        this.InspectionModel = true;
    }

    updateInspectionRecord() {
        updateInspectionImage({ imageList: this.InspectionImagesList })
            .then(result => {
                this.inspectionImages(this.estimateId);
            })
            .catch(error => {
            });
    }

    recordName = '';
    optionCount = 3;
    customPageTextPage = false;
    customPageUploadFile = false;
    @track ctmPgType = '';

    radioOptions = [
        { label: 'Upload File', value: 'Upload File' },
        { label: 'Text Page', value: 'Text Page' }
    ];

    handleRadioChange(event) {
        var Value = event.detail.value;
        this.ctmPgType = Value;
        if (Value === 'Upload File') {
            this.customPageUploadFile = true;
            this.customPageTextPage = false;
        } else if (Value === 'Text Page') {
            this.customPageUploadFile = false;
            this.customPageTextPage = true;
        }

        var customObj = {
            'Id': this.currentCustomPageRecordId,
            'QuoteForce__Type__c': Value
        };

        updateCustomPage({ customObj: customObj })
            .then(result => {
                console.log(result);
            })
            .catch(error => {
                console.log(JSON.stringify(error));
                this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
            });
    }

    handleInputChange(event) {
        this.recordName = event.target.value;
    }

    addNewOption() {
        if (this.recordName) {
            this.optionCount += 1;
            const newOption = {
                label: this.recordName,
                value: `option${this.optionCount}`
            };

            this.radioOptions = [...this.radioOptions, newOption];
            this.recordName = '';
        } else {
            console.error('Record name is required.');
        }
    }

    @api
    async handleSaveTeamplate() {
        if (!this.reportType) {
            this.showToast('Error', 'Layout Name is required', 'error');
            return;
        }

        try {
            // Fetch existing layouts
            const layouts = await getLayouts();

            // For update: exclude current record from duplicate check
            const isDuplicate = layouts.some(layout =>
                layout.QuoteForce__Layout_Name__c === this.reportType &&
                layout.Id !== this.recordId
            );

            if (isDuplicate) {
                this.showToast('Error', `Layout with name "${this.reportType}" already exists. Cannot create duplicate.`, 'error');
                return;
            }
            if (this.recordId) {

                var mstTmpObj = {
                    'Id': this.recordId,
                    'QuoteForce__Layout_Name__c': this.reportType,
                    'QuoteForce__Letter_from_the_owner__c': this.letterForm,
                    'QuoteForce__Zip_code_Postal_code__c': this.zipCode,
                    'QuoteForce__State_Province__c': this.stateProvince,
                    'QuoteForce__City__c': this.city,
                    'QuoteForce__Street_Address__c': this.streetAddress,
                    'QuoteForce__Last_Name__c': this.lastName,
                    'QuoteForce__First_Name__c': this.firstName,
                    'QuoteForce__Date__c': this.CreatedDate,
                    'QuoteForce__Primary_Image__c': this.primaryImage,
                    'QuoteForce__Secondary_Image__c': this.secondaryImage,
                    'QuoteForce__Pages_JSON__c': JSON.stringify(this.ElementList),
                    'QuoteForce__Terms_Condition_doc__c': this.termAndConditionUrl,
                    'QuoteForce__Warranty_Doc__c': this.warrantyUrl
                };

                UpdateMasterLayout({ mstLayoutObj: mstTmpObj })
                    .then(result => {
                        this.showToast('Success', 'Record Updated Successfully!', 'success');
                        this.uploadBulkFilesSF(result.Id);
                        this.dispatchEvent(new CustomEvent('save'));
                        this.closeModal();
                        this.refreshLayouts();
                        this.dispatchEvent(new CustomEvent('closemodal'));
                    })
                    .catch(error => {
                        this.showToast('Error', 'Failed to update record', 'error');
                    });

            } else {
                var mstTmpObj = {
                    'QuoteForce__Layout_Name__c': this.reportType,
                    'QuoteForce__Letter_from_the_owner__c': this.letterForm,
                    'QuoteForce__Zip_code_Postal_code__c': this.zipCode,
                    'QuoteForce__State_Province__c': this.stateProvince,
                    'QuoteForce__City__c': this.city,
                    'QuoteForce__Street_Address__c': this.streetAddress,
                    'QuoteForce__Last_Name__c': this.lastName,
                    'QuoteForce__First_Name__c': this.firstName,
                    'QuoteForce__Date__c': this.CreatedDate,
                    'QuoteForce__Primary_Image__c': this.primaryImage,
                    'QuoteForce__Secondary_Image__c': this.secondaryImage,
                    'QuoteForce__Pages_JSON__c': JSON.stringify(this.ElementList),
                    'QuoteForce__Terms_Condition_doc__c': this.termAndConditionUrl,
                    'QuoteForce__Warranty_Doc__c': this.warrantyUrl
                };
                CreateMasterLayout({ mstLayoutObj: mstTmpObj })
                    .then(result => {
                        this.recordId = result.Id;
                        this.uploadBulkFilesSF(result.Id);
                        this.dispatchEvent(new CustomEvent('edit', { detail: { recordId: this.recordId } }));
                        this.dispatchEvent(new CustomEvent('save'));
                        this.dispatchEvent(new CustomEvent('closemodal'));
                        this.refreshLayouts();
                        SectionUpdate({ quoteId: this.recordId })
                            .then(data => {
                                console.log('data : ', data);
                            })
                            .catch(err => {
                                console.error('[loadSectionData] Error:', err);
                            });
                        this.ElementList.forEach(item => {
                            if (item.Name === 'Custom Page') {
                                console.log('item - - - - :', JSON.stringify(item));
                                var customObj = {
                                    'Id': item.Id,
                                    'QuoteForce__Master_Template__c': this.recordId
                                };
                                updateCustomPage({ customObj: customObj })
                                    .then(result => {
                                        console.log(result);
                                    })
                                    .catch(error => {
                                        console.log(JSON.stringify(error));
                                        this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
                                    });
                            }
                        });
                    })
                    .catch(error => {
                        console.log('error while creating record: ', JSON.stringify(error));
                        this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
                    });
            }
        } catch (error) {
            console.error(error);
            this.showToast('Error', 'An unexpected error occurred: ' + error.body?.message || error.message, 'error');
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }

    // function to upload all the images - in working
    handleUploadDocuments(event) {
        try {
            let docType = event.target.name;

            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                const fileUrl = URL.createObjectURL(file);

                var reader = new FileReader();
                reader.onload = () => {
                    var base64 = reader.result.split(',')[1];

                    let tempObj = {
                        'filename': docType,
                        'base64': base64,
                        'quoteId': ((this.currentCustomPageRecordId)?.length > 15) ? this.currentCustomPageRecordId : this.quoteId
                    };

                    this.uploadedDocumentList.push(tempObj);

                    uploadFile({
                        base64Data: base64,
                        fileName: docType,
                        parentId: tempObj.quoteId
                    })
                        .then(result => {
                            console.log('File uploaded successfully. IDs: ', result);

                            let previewUrl = `/sfc/servlet.shepherd/version/download/${result.latestVersionId}`;

                            if (docType === 'customPageDoc') {
                                if (this.currentCustomPageRecordId?.length > 15) {
                                    this.currentSelectedCustomPage.customPageDocUrl = previewUrl;
                                    this.currentSelectedCustomPage.customPageImageAvl = true;
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error uploading file', error);
                        });
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.log('Error while uploading file: ', error);
        }
    }

    // to delete the temp. document  - in working
    handleDeleteTempDocs(event) {
        try {
            let docType = event.target.dataset.doctype;
            let contentDocId = event.target.dataset.contentid;

            switch (docType) {
                case 'primaryDoc':
                    if (contentDocId)
                        this.deleteMasterTemplateDocsSF(contentDocId, 'Primary Image');

                    this.uploadedDocUrls.primaryDocUrl = undefined;
                    this.isDocAvailable.primaryImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'SecondaryDoc':

                    if (contentDocId)
                        this.deleteMasterTemplateDocsSF(contentDocId, 'Secondary Image');

                    this.uploadedDocUrls.secondaryDocUrl = undefined;
                    this.isDocAvailable.secondaryImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'warrantyDoc':

                    if (contentDocId)
                        this.deleteMasterTemplateDocsSF(contentDocId, 'Warranty Image');

                    this.uploadedDocUrls.warrantyDocUrl = undefined;
                    this.isDocAvailable.warrantyImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'TermConditionDoc':

                    if (contentDocId)
                        this.deleteMasterTemplateDocsSF(contentDocId, 'Term & Condition Image');

                    this.uploadedDocUrls.termConditionDocUrl = undefined;
                    this.isDocAvailable.termConditionImageAvl = false;
                    this.removeTempDoc(docType);
                    break;

                case 'customPageDoc':
                    if (contentDocId)
                        this.deleteMasterTemplateDocsSF(contentDocId, 'Custom Page Document');

                    this.currentSelectedCustomPage.customPageDocUrl = undefined;
                    this.currentSelectedCustomPage.customPageImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
            }


        } catch (error) {
            console.log('## in the error delete: ', error);
        }
    }

    // to remove that image from the delete icon - in working
    removeTempDoc(docType) {
        try {
            const index = this.uploadedDocumentList.findIndex(ele => {
                return ele.filename == docType;
            });
            if (index !== -1) {
                this.uploadedDocumentList.splice(index, 1);
            }
        } catch (error) {
            console.log('## in the delete temp image: ', error);
        }
    }

    // to upload file in the bulk - in working
    async uploadBulkFilesSF(recordId) {
        try {
            const result = await uploadBulkFiles({ filesJson: JSON.stringify(this.uploadedDocumentList), recId: recordId });

        } catch (error) {
            console.error('## in the er: ', error);
        }
    }

    async fetchQuoteDocumentsOnly() {
        console.log('fetchQuoteDocumentsOnly : ',);
        try {
            const result = await getQuoteDocumentLinks({ quoteId: this.quoteId });
            if (result?.ContentDocumentLinks?.length > 0) {
                result.ContentDocumentLinks.forEach(ele => {
                    let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                    let imageTitle = ele?.ContentDocument?.Title;
                    let conDoctId = ele?.ContentDocumentId;

                    if (imageTitle === 'primaryDoc') {
                        this.uploadedDocUrls.primaryDocUrl = imageUrl;
                        this.isDocAvailable.primaryImageAvl = true;
                        this.contentDocId.primaryDocId = conDoctId;
                    }

                    if (imageTitle === 'SecondaryDoc') {
                        this.uploadedDocUrls.secondaryDocUrl = imageUrl;
                        this.isDocAvailable.secondaryImageAvl = true;
                        this.contentDocId.secondaryDocId = conDoctId;
                    }
                    if (imageTitle == 'warrantyDoc') {
                        this.uploadedDocUrls.warrantyDocUrl = imageUrl;
                        this.isDocAvailable.warrantyImageAvl = true;
                        this.contentDocId.warrantyDocId = conDoctId;

                    }
                    if (imageTitle == 'TermConditionDoc') {
                        this.uploadedDocUrls.termConditionDocUrl = imageUrl;
                        this.isDocAvailable.termConditionImageAvl = true;
                        this.contentDocId.termConDocId = conDoctId;
                    }
                });
            }

        } catch (error) {
            console.error('Error fetching quote documents only:', error);
        }
    }

    // to get the documents from the master template - in working
    async fetchUploadedMasterTemplateDocs() {
        console.log('fetchUploadedMasterTemplateDocs : ');
        try {
            const result = await getLayoutRecord({ mtId: this.recordId });
            console.log('## result: ', JSON.stringify(result));
            if (result) {
                result?.ContentDocumentLinks.forEach(ele => {
                    let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                    let imageTitle = ele?.ContentDocument?.Title;
                    let conDoctId = ele?.ContentDocumentId;

                    if (imageTitle === 'primaryDoc') {
                        this.uploadedDocUrls.primaryDocUrl = imageUrl;
                        this.isDocAvailable.primaryImageAvl = true;
                        this.contentDocId.primaryDocId = conDoctId;
                    } else if (imageTitle === 'SecondaryDoc') {
                        this.uploadedDocUrls.secondaryDocUrl = imageUrl;
                        this.isDocAvailable.secondaryImageAvl = true;
                        this.contentDocId.secondaryDocId = conDoctId;
                    } else if (imageTitle === 'warrantyDoc') {
                        this.uploadedDocUrls.warrantyDocUrl = imageUrl;
                        this.isDocAvailable.warrantyImageAvl = true;
                        this.contentDocId.warrantyDocId = conDoctId;
                    } else if (imageTitle === 'TermConditionDoc') {
                        this.uploadedDocUrls.termConditionDocUrl = imageUrl;
                        this.isDocAvailable.termConditionImageAvl = true;
                        this.contentDocId.termConDocId = conDoctId;
                    }
                });

                if (
                    this.contentDocId.primaryDocId || this.contentDocId.secondaryDocId ||
                    this.contentDocId.warrantyDocId || this.contentDocId.termConDocId
                ) {
                    await attachDocsToQuote({
                        quoteId: this.quoteId,
                        primaryDocId: this.contentDocId.primaryDocId,
                        secondaryDocId: this.contentDocId.secondaryDocId,
                        warrantyDocId: this.contentDocId.warrantyDocId,
                        termConDocId: this.contentDocId.termConDocId
                    });
                }
            }
        } catch (error) {
            console.error('## error in fetchUploadedMasterTemplateDocs: ', JSON.stringify(error));
        }
    }


    // to delete the document from the master template object - in working
    async deleteMasterTemplateDocsSF(contentId, fileName) {
        try {
            console.log('## contentId: ', contentId);
            await deleteFile({ contentDocumentId: contentId });
            this.showToast('Success', `${fileName} Deleted successfully`, 'success');
        } catch (error) {
            this.showToast('Error', 'Failed to delete The Document: ' + error?.body?.message, 'error');
        }
    }

    handleEditCustomPageName() {
        this.editCustomPageName = true;
    }

    handleChangeCustomPageName(event) {
        this.currentSelectedCustomPage.Name = event.target.value;
    }

    async handleSaveCustomPageName(event) {
        try {
            this.editCustomPageName = false;
            let recId = event.target.dataset.recid;

            let tempCustomObj = {
                'Id': recId,
                'Name': this.currentSelectedCustomPage.Name
            };
            await updateCustomPage({ customObj: tempCustomObj });

        } catch (error) {
            this.showToast('Unexpected Error!', 'Unable to update the Custom Page Name.', 'error');
        }
    }

    handleTextValueChange(event) {
        console.log('## mine: ', event.target.dataset.recid);
        this.currentSelectedCustomPage.richTextValue = event.target.value;
    }

    async handleUpdateCustomTextFieldValue(event) {
        try {
            let recId = event.target.dataset.recid;

            let tempCustomObj = {
                'Id': recId,
                'QuoteForce__Text_Page__c': this.currentSelectedCustomPage.richTextValue
            };
            await updateCustomPage({ customObj: tempCustomObj });

        } catch (error) {
            this.showToast('Unexpected Error!', 'Unable to update the Text Field Value.', 'error');
        }
    }

    @track deleteCustomPageModal = false;
    @track selectedDeletPageRecord;

    handleClickOnDeleteCustomPage(event) {
        this.deleteCustomPageModal = true
        this.selectedDeletPageRecord = event.currentTarget.dataset.recid;
        console.log('selectedDeletPageRecord : ', this.selectedDeletPageRecord);
    }

    handleClickOnCancelDeleteCustomPage() {
        this.deleteCustomPageModal = false;
    }

    handleDeleteCustomPage() {
        const layoutId = this.selectedDeletPageRecord;
        this.ElementList = this.ElementList.filter(item => item.Id !== layoutId);

        deleteLayoutPage({ layoutId })
            .then(() => {
                this.showToast('Success', 'Record successfully deleted!', 'success');
                const mstTmpObj = {
                    'Id': this.recordId,
                    'QuoteForce__Pages_JSON__c': JSON.stringify(this.ElementList)
                };
                UpdateMasterLayout({ mstLayoutObj: mstTmpObj })
                    .then(() => {
                        this.handleClickOnCancelDeleteCustomPage();
                        this.ElementList.forEach(result => {
                            if (result.label == 'Title') {
                                result.selected = true;
                                this.titlePageSelected = true;
                                this.pageLabel = result.label;
                            } else {
                                result.selected = false;
                            }
                        });
                    })
                    .catch(error => {
                    });
            })
            .catch(error => {
                console.log('error : ', JSON.stringify(error));
                this.showToast('Error', 'Failed to delete layout or associated files', 'error');
                this.isLoading = false;
            });
    }


    // -----------------------------------------------------------------------------------------------------

    @track primaryImageUrl;
    @track secondaryImageUrl;

    primaryDocId;
    secondaryDocId;

    triggerPrimarySelect() {
        this.template.querySelector('[data-id="primaryInput"]').click();
    }
    triggerSecondarySelect() {
        this.template.querySelector('[data-id="secondaryInput"]').click();
    }

    // Primary Upload
    handlePrimaryUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.readFile(file).then(base64 => {
                uploadFile({ base64Data: base64, fileName: file.name, parentId: this.quoteId })
                    .then(result => {
                        this.primaryDocId = result.documentId;
                        this.primaryImageUrl = `/sfc/servlet.shepherd/version/download/${result.latestVersionId}`;

                        return saveImageUrl({
                            recordId: this.quoteId,
                            fieldName: this.apiName('QuoteForce__Primary_Image__c'),
                            fileUrl: this.primaryImageUrl
                        });
                    })
                    .catch(err => console.error('Upload error', err));
            });
        }
    }


    // Delete Primary
    handleDeletePrimary() {
        this.primaryImageUrl = null;
        this.primaryDocId = null;
        saveImageUrl({ recordId: this.quoteId, fieldName: this.apiName('QuoteForce__Primary_Image__c'), fileUrl: null });
    }

    // Helper: Read file
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    // Secondary Upload
    handleSecondaryUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.readFile(file).then(base64 => {
                uploadFile({ base64Data: base64, fileName: file.name, parentId: this.quoteId })
                    .then(result => {
                        this.secondaryDocId = result.documentId;
                        this.secondaryImageUrl = `/sfc/servlet.shepherd/version/download/${result.latestVersionId}`;

                        return saveImageUrl({
                            recordId: this.quoteId,
                            fieldName: this.apiName('QuoteForce__Secondary_Image__c'),
                            fileUrl: this.secondaryImageUrl
                        });
                    })
                    .catch(err => console.error('Upload error', err));
            });
        }
    }

    // Delete Secondary
    handleDeleteSecondary() {
        this.secondaryImageUrl = null;
        this.secondaryDocId = null;

        saveImageUrl({
            recordId: this.quoteId,
            fieldName: this.apiName('QuoteForce__Secondary_Image__c'),
            fileUrl: null
        });
    }

    // -----------------------------------------------------------------------------------------------------


    get quoteid() {
        return this.sourceQuoteId || this.invoiceId;
    }

    get quoteId() {
        return this.invoiceId;
    }

    get quoteDetailRecordId() {
        return this.sourceQuoteId || this.invoiceId;
    }
}