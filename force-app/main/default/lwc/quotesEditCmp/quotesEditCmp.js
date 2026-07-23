import { LightningElement, track, api, wire } from 'lwc';
import CreateMasterLayout from '@salesforce/apex/createMasterTemplateRecord.CreateMasterLayout';
import CreateCustomPage from '@salesforce/apex/createMasterTemplateRecord.CreateCustomPage';
import updateCustomPage from '@salesforce/apex/createMasterTemplateRecord.updateCustomPage';
import uploadBulkFiles from '@salesforce/apex/createMasterTemplateRecord.uploadBulkFiles';
import getLayoutRecord from '@salesforce/apex/createMasterTemplateRecord.getLayoutRecord';
import updateQuoteDetails from '@salesforce/apex/createMasterTemplateRecord.updateQuoteDetails';
import getCustomPage from '@salesforce/apex/createMasterTemplateRecord.getCustomPageQuote';
import UpdateMasterLayout from '@salesforce/apex/createMasterTemplateRecord.UpdateMasterLayout';
import deleteFile from '@salesforce/apex/createMasterTemplateRecord.deleteFile';
import deleteLayoutPage from '@salesforce/apex/createMasterTemplateRecord.deleteLayoutPage';
import deleteQuoteFile from '@salesforce/apex/createMasterTemplateRecord.deleteQuoteFile';
import uploadFile from '@salesforce/apex/createMasterTemplateRecord.uploadFileQuote';
import getLayouts from '@salesforce/apex/createMasterTemplateRecord.getLayouts';
import getQuoteDetails from '@salesforce/apex/createMasterTemplateRecord.getQuoteDetails';
import cloneTemplateDocsToQuote from '@salesforce/apex/createMasterTemplateRecord.cloneTemplateDocsToQuote';
import getQuoteDocumentLinks from '@salesforce/apex/createMasterTemplateRecord.getQuoteDocumentLinks';
import SectionUpdate from '@salesforce/apex/ProductConfigurationController.SectionUpdate';
import SectionDeleteCancel from '@salesforce/apex/ProductConfigurationController.SectionDeleteCancel';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';

import saveImageUrl from '@salesforce/apex/createMasterTemplateRecord.saveImageUrl';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
export default class QuotesEditCmp extends NavigationMixin(LightningElement) {


    //@api isEditMode = false;

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
    @track currentSelectedCustomPage = {};
    currentCustomPageRecordId = '';
    fileTypes = ['.jpg', '.png', '.jpeg'];
    loaded = false;

    @track dataPageName = 'Title';
    @api templateId;
    @api CreatedDate;
    @api recordId;
    @api quoteId;
    @api mode;
    @api isFromQuote = false;
    @track cDate;
    @track layout__Name;
    @track pageLabel = '';
    @track loaded = false;
    @track titlePageSelected = true;
    @track latterFormTheOwnerPageSelected = false;
    @track quoteDetailPageSelected = false;
    @track WarrantyPageSelected = false;
    @track TermsAndConditionPageSelected = false;
    @track customePage = false;
    @track customPageRichTextValue = '';
    @track customPageDocUrl = undefined;
    @track customPageDocId = undefined;
    @track customPageImageAvl = false;
    @track customPageEditorVisible = true;
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
    @api currencyType = '';
    @track priceBookId = '';
    @track priceBookOptions = [];

    currencyOptions = [
        { label: 'USD ($)', value: 'USD' },
        { label: 'INR (Rs)', value: 'INR' },
        { label: 'EUR (EUR)', value: 'EUR' },
        { label: 'GBP (GBP)', value: 'GBP' }
    ];
    warrantyImageBase64
    termAndConditionUrl = '';

    connectedCallback() {
         console.log('### STEP3 quotesEditCmp connectedCallback');
    console.log('### STEP3 currencyType =>', this.currencyType);
    console.log('### STEP3 quoteId =>', this.quoteId);
        this.loaded = true;

        if (this.quoteId && this.quoteId !== '') {
            this.loadPriceBookOptions();

            setTimeout(async () => {
                if (this.recordId) {
                    await this.fetchUploadedMasterTemplateDocsReadOnly();
                }
                this.getQuoteDetailsFromApex();
            }, 3000);
        }
    }

    renderedCallback() {
        if (!this.customePage || !this.customPageTextPage) {
            return;
        }

        const richTextCmp = this.template.querySelector('lightning-input-rich-text[data-role="custom-page-richtext"]');
        if (richTextCmp) {
        }
    }

    refreshCustomPageEditor() {
        this.customPageEditorVisible = false;
        Promise.resolve().then(() => {
            this.customPageEditorVisible = true;
        });
    }

getQuoteDetailsFromApex() {
    this.loaded = true;

    getQuoteDetails({ recordId: this.quoteId })
        .then(result => {
            console.log('### STEP4 getQuoteDetails result =>', JSON.stringify(result));
            console.log('### STEP4 Currency from DB =>', result.QuoteForce__Currency__c);
            this.currencyType = result.QuoteForce__Currency__c;
            console.log('### STEP4 currencyType set to =>', this.currencyType);

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
                this.currencyType = result.QuoteForce__Currency__c;
                this.priceBookId = result.QuoteForce__Price_Book__c || '';

                // Safe JSON parsing
                this.ElementList = result.QuoteForce__Pages_JSON__c
                    ? JSON.parse(result.QuoteForce__Pages_JSON__c)
                    : this.ElementList;

                /* ---------------- WARRANTY IMAGE LOGIC ---------------- */

                const warrantyPage = this.ElementList.find(p => p.label === 'Warranty');

                if (!warrantyPage || warrantyPage.warrantyImage === undefined) {
                    // Template default image
                    this.warrantyUrl = result.QuoteForce__Warranty__c;

                } else if (warrantyPage.warrantyImage === null) {
                    // User deleted image
                    this.warrantyUrl = null;

                } else {
                    // User uploaded new image
                    this.warrantyUrl = warrantyPage.warrantyImage;
                }

                /* ------------- TERMS & CONDITIONS IMAGE LOGIC ---------- */

                const termPage = this.ElementList.find(p => p.label === 'Terms and Conditions');

                if (!termPage || termPage.termConditionImage === undefined) {
                    // Template default image
                    this.termAndConditionUrl = result.QuoteForce__Terms_Conditions__c;

                } else if (termPage.termConditionImage === null) {
                    // User deleted image
                    this.termAndConditionUrl = null;

                } else {
                    // User uploaded new image
                    this.termAndConditionUrl = termPage.termConditionImage;
                }
                console.log('primary image url1'+this.primaryImageUrl);
                console.log('secondary  image url1'+this.secondaryImageUrl);
                /* -------------------------------------------------------- */
                this.layout__Name = result.QuoteForce__Layout_Name__c;
                this.primaryImageUrl =result.QuoteForce__Primary_Image__c ||this.primaryImageUrl;
                this.secondaryImageUrl =result.QuoteForce__Secondary_Image__c ||this.secondaryImageUrl;
                console.log('primary image url'+this.primaryImageUrl);
                console.log('secondary  image url'+this.secondaryImageUrl);

                this.ElementList.forEach(page => {
                    if (page.label === 'Title') {
                        page.selected = true;
                        this.pageLabel = page.label;
                    } else {
                        page.selected = false;
                    }
                });

                this.dataPageName = this.ElementList[0].Name;
            }

            this.loaded = false;
        })
        .catch(error => {
            this.loaded = false;
        });
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
        this.clickCount = this.ElementList.filter(
                item => item && item.label?.includes('Custom Page')
            ).length + 1;

        // let customObj = {
        //     'Name': `Custom Page`,
        //     'QuoteForce__label__c': `Custom Page ${this.clickCount}`,
        //     'QuoteForce__selected__c': false,
        //     'QuoteForce__editMode__c': false,
        //     'QuoteForce__toggle__c': false,
        //     'QuoteForce__Quotes__c': this.quoteid
        // };

        // CreateCustomPage({ customObj: customObj })
        CreateCustomPage({
                name: `Custom Page ${this.clickCount}`,
                label: `Custom Page ${this.clickCount}`,
                masterTemplateId: this.templateId || this.recordId,
                quoteId: this.quoteid
            })
            .then(result => {
                let newElement = {
                    Id: result.Id,
                    Name: `Custom Page ${this.clickCount}`,
                    label: `Custom Page ${this.clickCount}`,
                    selected: false,
                    editMode: false,
                    toggle: false
                };
                getCustomPage({ recordId: this.quoteid })
                    .then(result => {
                        result.forEach(element => {
                            if (element.Id == this.currentCustomPageRecordId) {
                                this.ctmPgType = element.QuoteForce__Type__c;
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
                    });
                this.ElementList.push(newElement);
            })
            .catch(error => {
                this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
            });
            console.log('ElementList', JSON.stringify(this.ElementList));
    }

    handleChangeToggle(event) {
        console.log(
    'Toggle Changed => ',
    JSON.stringify(this.ElementList)
);
        this.loaded = true;
        var dataLabel = event.currentTarget.dataset.label;
        this.ElementList.forEach(result => {
            if (result.label === dataLabel) {
                result.toggle = event.target.checked;
                this.loaded = false;
            }
        })
           console.log(
        'Toggle Changed => ',
        JSON.stringify(this.ElementList)
    );
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


        if (JSON.stringify(dataLabel).includes("Custom Page")) {
            getCustomPage({ recordId: this.quoteid })
                .then(result => {
                    result.forEach(element => {
                        if (element.Id == this.currentCustomPageRecordId) {
                            const freshPage = this.ElementList.find(ele => ele.Id === this.currentCustomPageRecordId) || {};
                            const selectedCustomPage = {
                                ...freshPage,
                                Id: element.Id,
                                Name: freshPage.Name || element.Name,
                                label: element.QuoteForce__label__c || freshPage.label,
                                richTextValue: element.QuoteForce__Text_Page__c || '',
                                customPageDocUrl: undefined,
                                customPageImageAvl: false,
                                customPageDocId: undefined
                            };

                            if (element.ContentDocumentLinks && element.ContentDocumentLinks.length > 0) {
                                const lastDoc = element.ContentDocumentLinks[element.ContentDocumentLinks.length - 1];
                                const doc = lastDoc?.ContentDocument;
                                if (doc?.LatestPublishedVersionId) {
                                    selectedCustomPage.customPageDocUrl = `/sfc/servlet.shepherd/version/download/${doc.LatestPublishedVersionId}`;
                                    selectedCustomPage.customPageImageAvl = true;
                                    selectedCustomPage.customPageDocId = lastDoc.ContentDocumentId;
                                }
                            }

                            this.currentSelectedCustomPage = { ...selectedCustomPage };
                            this.customPageRichTextValue = selectedCustomPage.richTextValue || '';
                            this.customPageDocUrl = selectedCustomPage.customPageDocUrl;
                            this.customPageDocId = selectedCustomPage.customPageDocId;
                            this.customPageImageAvl = !!selectedCustomPage.customPageImageAvl;
                            this.refreshCustomPageEditor();
                            this.ctmPgType = element.QuoteForce__Type__c;
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
                });
        }



        // finding the data of the selected page
        if (!this.customePage) {
            this.currentSelectedCustomPage = {
                ...(this.ElementList.find(ele => ele.Id === this.currentCustomPageRecordId) || {})
            };
            this.customPageRichTextValue = this.currentSelectedCustomPage.richTextValue || '';
            this.customPageDocUrl = this.currentSelectedCustomPage.customPageDocUrl;
            this.customPageDocId = this.currentSelectedCustomPage.customPageDocId;
            this.customPageImageAvl = !!this.currentSelectedCustomPage.customPageImageAvl;
        }

        if (this.currentSelectedCustomPage && !this.customePage) {
            const ele = this.currentSelectedCustomPage;
            const imageUrl = ele.customPageDocUrl;
            const imageTitle = ele?.ContentDocument?.Title;
            const conDoctId = ele?.ContentDocumentId;

            if (imageTitle === 'customPageDoc') {
                ele.customPageDocUrl = imageUrl;
                ele.customPageImageAvl = true;
            }
        }
        console.log('currentSelectedCustomPage', JSON.stringify(this.currentSelectedCustomPage))
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
            });
    }

    handleDateFieldsChange(event) {
        this.CreatedDate = event.target.value;
    }

    handleRichInputFieldsChange(event) {
        this.letterForm = event.target.value;
    }


    @api updateQuote(newQuoteId) { 
    const targetId = newQuoteId ? newQuoteId : this.quoteId;

    updateQuoteDetails({
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
        currencyType: this.currencyType,
        priceBookId: this.priceBookId || null
    })
    .then((result) => {
        this.showToast('Success', 'Saved successfully!', 'success');
        
        this.navigateToQuote(targetId);
    })
    .catch(error => {
        this.showToast('Error', 'Save failed', 'error');
    });
}

@api
updateQuoteAndWait(newQuoteId) {
    const targetId = newQuoteId ? newQuoteId : this.quoteId;

    return updateQuoteDetails({
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
        currencyType: this.currencyType,
        priceBookId: this.priceBookId || null
    });
    // ⚠️ Navigate NAHI karega — sirf save karega silently
}

    navigateToQuote(targetId) {
    if (!targetId) {
        this.showToast('Error', 'Invalid quote Id', 'error');
        return;
    }
    window.location.href = '/' + targetId;
}

    apiName(name) {
        return name;
    }

    isSalesforceId(value) {
        return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value || '');
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
            })
            .catch(err => {
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
            })
            .catch(error => {
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
        }
    }

    @api
    async handleSaveTeamplate() {
        if (!this.reportType) {
            this.showToast('Error', 'Layout Name is required', 'error');
            this.fetchUploadedMasterTemplateDocs();
            return;
        }

        try {
            // Fetch existing layouts
            const layouts = await getLayouts();

            // For update: exclude current record from duplicate check
            const isDuplicate = layouts.some(layout =>
                layout.QuoteForce__Layout_Name__c === this.reportType &&
                layout.Id !== this.recordId // ignore current record when updating
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
                        this.fetchUploadedMasterTemplateDocs();
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
                        this.fetchUploadedMasterTemplateDocs();
                        this.dispatchEvent(new CustomEvent('edit', { detail: { recordId: this.recordId } }));
                        this.dispatchEvent(new CustomEvent('save'));
                        this.dispatchEvent(new CustomEvent('closemodal'));
                        this.refreshLayouts();
                        SectionUpdate({ quoteId: this.recordId })
                            .then(data => {
                            })
                            .catch(err => {
                            });
                        this.ElementList.forEach(item => {
                            if (item.Name === 'Custom Page') {
                                var customObj = {
                                    'Id': item.Id,
                                    'QuoteForce__Master_Template__c': this.recordId
                                };
                                updateCustomPage({ customObj: customObj })
                                    .then(result => {
                                    })
                                    .catch(error => {
                                        this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
                                    });
                            }
                        });
                    })
                    .catch(error => {
                        this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
                    });
            }
        } catch (error) {
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

    /*
    * Created on Thu Jan 23 2025
    * Description: function to upload file in th master-template object
    * Created by: Shubham Sen
    * Copyright (c) 2025 NSIQ infotech pvt. ltd.
    */


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
                        'filename': file.name,
                        'base64': base64,
                        'quoteId': ((this.currentCustomPageRecordId)?.length > 15) ? this.currentCustomPageRecordId : this.quoteId
                    };

                    this.uploadedDocumentList.push(tempObj);

                    // Call Apex to actually upload the file
                    uploadFile({
                        base64Data: base64,
                        fileName: file.name,
                        parentId: tempObj.quoteId
                    })
                        .then(result => {
                            // ✅ Build proper preview URL from latestVersionId (068)
                            let previewUrl = `/sfc/servlet.shepherd/version/download/${result.latestVersionId}`;

                            // If this is customPageDoc update the record
                            if (docType === 'customPageDoc') {
                                if (this.currentCustomPageRecordId?.length > 15) {
                                    this.currentSelectedCustomPage = {
                                        ...this.currentSelectedCustomPage,
                                        customPageDocUrl: previewUrl,
                                        customPageImageAvl: true
                                    };
                                    this.customPageDocUrl = previewUrl;
                                    this.customPageImageAvl = true;
                                }
                            }
                        })
                        .catch(error => {
                        });
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
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

                    this.currentSelectedCustomPage = {
                        ...this.currentSelectedCustomPage,
                        customPageDocUrl: undefined,
                        customPageImageAvl: false
                    };
                    this.customPageDocUrl = undefined;
                    this.customPageImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
            }


        } catch (error) {
        }
    }

    // to remove that image from the delete icon - in working
    removeTempDoc(docType) {
        try {
            // removing from the list of uploadedDocumentList 
            const index = this.uploadedDocumentList.findIndex(ele => {
                return ele.filename == docType;
            });
            if (index !== -1) {
                this.uploadedDocumentList.splice(index, 1);
            }
        } catch (error) {
        }
    }

    // to upload file in the bulk - in working
    async uploadBulkFilesSF(recordId) {
        try {
            const result = await uploadBulkFiles({ filesJson: JSON.stringify(this.uploadedDocumentList), recId: recordId });

        } catch (error) {
        }
    }

    async fetchQuoteDocumentsOnly() {
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
        }
    }

    // to get the documents from the master template - in working
    async fetchUploadedMasterTemplateDocs() {
        try {
            const result = await getLayoutRecord({ mtId: this.recordId });
            if (result) {
                result?.ContentDocumentLinks.forEach(ele => {
                    let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                    let imageTitle = ele?.ContentDocument?.Title;
                    let conDoctId = ele?.ContentDocumentId;

                    if (imageTitle === 'primaryDoc') {
                        this.uploadedDocUrls.primaryDocUrl = imageUrl;
                        this.primaryImageUrl = imageUrl;
                        this.isDocAvailable.primaryImageAvl = true;
                        this.contentDocId.primaryDocId = conDoctId;
                    } else if (imageTitle === 'SecondaryDoc') {
                        this.uploadedDocUrls.secondaryDocUrl = imageUrl;
                        this.secondaryImageUrl = imageUrl;
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

                const clonedDocUrls = await cloneTemplateDocsToQuote({
                    templateId: this.recordId,
                    quoteId: this.quoteId
                });

                if (clonedDocUrls?.primaryImageUrl) {
                    this.primaryImageUrl = clonedDocUrls.primaryImageUrl;
                    this.uploadedDocUrls.primaryDocUrl = clonedDocUrls.primaryImageUrl;
                    this.isDocAvailable.primaryImageAvl = true;
                }

                if (clonedDocUrls?.secondaryImageUrl) {
                    this.secondaryImageUrl = clonedDocUrls.secondaryImageUrl;
                    this.uploadedDocUrls.secondaryDocUrl = clonedDocUrls.secondaryImageUrl;
                    this.isDocAvailable.secondaryImageAvl = true;
                }
            }
        } catch (error) {
        }
    }


    // to delete the doucument from the master template object - in working
    async deleteMasterTemplateDocsSF(contentId, fileName) {
        try {
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

        const updatedValue = event.target.value;

        this.currentSelectedCustomPage = {
            ...this.currentSelectedCustomPage,
            Name: updatedValue
        };

        this.ElementList.forEach(item => {
            if (item.Id === this.currentSelectedCustomPage.Id) {
                item.Name = updatedValue;
            }
        });

        this.ElementList = [...this.ElementList];
    }

    handleTextValueChange(event) {
        this.customPageRichTextValue = event.target.value;
        this.currentSelectedCustomPage = {
            ...this.currentSelectedCustomPage,
            richTextValue: event.target.value
        };
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
                // Remove the deleted layout from the list
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
                this.showToast('Error', 'Failed to delete layout or associated files', 'error');
                this.isLoading = false; // Stop loading state in case of error
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
                        this.primaryDocId = result.documentId; // 069
                        // ✅ Correct URL with 068 (latest version)
                        this.primaryImageUrl = `/sfc/servlet.shepherd/version/download/${result.latestVersionId}`;

                        return saveImageUrl({
                            recordId: this.quoteId,
                            fieldName: this.apiName('QuoteForce__Primary_Image__c'),
                            fileUrl: this.primaryImageUrl
                        });
                    })
                    .catch(() => {});
            });
        }
    }


    // Delete
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
                        this.secondaryDocId = result.documentId; // 069
                        // ✅ Correct URL with 068 (latest version)
                        this.secondaryImageUrl = `/sfc/servlet.shepherd/version/download/${result.latestVersionId}`;

                        return saveImageUrl({
                            recordId: this.quoteId,
                            fieldName: this.apiName('QuoteForce__Secondary_Image__c'),
                            fileUrl: this.secondaryImageUrl
                        });
                    })
                    .catch(() => {});
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


    handleWarrantyUpload(event) {

        const file = event.target.files[0];

        if (file) {

            const reader = new FileReader();

            reader.onload = () => {

                this.warrantyUrl = reader.result;

                this.ElementList = this.ElementList.map(page => {
                    if (page.label === 'Warranty') {
                        return { ...page, warrantyImage: reader.result };
                    }
                    return page;
                });

            };

            reader.readAsDataURL(file);
        }

    }

    handleDeleteWarranty() {

        this.warrantyUrl = null;

        this.ElementList = this.ElementList.map(page => {
            if (page.label === 'Warranty') {
                return { ...page, warrantyImage: null };
            }
            return page;
        });

    }

    handleTermConditionUpload(event) {

        const file = event.target.files[0];

        if (file) {

            const reader = new FileReader();

            reader.onload = () => {

                this.termAndConditionUrl = reader.result;

                this.ElementList = this.ElementList.map(page => {
                    if (page.label === 'Terms and Conditions') {
                        return { ...page, termConditionImage: reader.result };
                    }
                    return page;
                });

            };

            reader.readAsDataURL(file);
        }

    }

    handleDeleteTermCondition() {

        this.termAndConditionUrl = null;

        this.ElementList = this.ElementList.map(page => {
            if (page.label === 'Terms and Conditions') {
                return { ...page, termConditionImage: null };
            }
            return page;
        });

    }

    get quoteid() {
        return this.quoteId;
    }
async fetchUploadedMasterTemplateDocsReadOnly() {
    try {
        const result = await getLayoutRecord({ mtId: this.recordId });
        if (result) {
            result?.ContentDocumentLinks.forEach(ele => {
                let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                let imageTitle = ele?.ContentDocument?.Title;
                let conDoctId = ele?.ContentDocumentId;

                if (imageTitle === 'primaryDoc') {
                    this.uploadedDocUrls.primaryDocUrl = imageUrl;
                    this.primaryImageUrl = imageUrl;
                    this.isDocAvailable.primaryImageAvl = true;
                    this.contentDocId.primaryDocId = conDoctId;
                } else if (imageTitle === 'SecondaryDoc') {
                    this.uploadedDocUrls.secondaryDocUrl = imageUrl;
                    this.secondaryImageUrl = imageUrl;
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
        }
    } catch (error) {
        console.error('fetchUploadedMasterTemplateDocsReadOnly error:', error);
    }
}

}