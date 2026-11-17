import { LightningElement, api, wire } from 'lwc';

import {
    createRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    getFieldValue
} from 'lightning/uiRecordApi';

import {
    getObjectInfo,
    getPicklistValues
} from 'lightning/uiObjectInfoApi';

import { ShowToastEvent }
    from 'lightning/platformShowToastEvent';

import SERVICE_REQUEST_OBJECT
    from '@salesforce/schema/Service_Request__c';

import ID_FIELD
    from '@salesforce/schema/Service_Request__c.Id';

import NAME_FIELD
    from '@salesforce/schema/Service_Request__c.Name';

import EXTERNAL_ID_FIELD
    from '@salesforce/schema/Service_Request__c.External_System_ID__c';

import SUBJECT_FIELD
    from '@salesforce/schema/Service_Request__c.Subject__c';

import PRIORITY_FIELD
    from '@salesforce/schema/Service_Request__c.Priority__c';

import STATUS_FIELD
    from '@salesforce/schema/Service_Request__c.Status__c';

import ACCOUNT_FIELD
    from '@salesforce/schema/Service_Request__c.Account__c';

const REQUEST_FIELDS = [
    NAME_FIELD,
    EXTERNAL_ID_FIELD,
    SUBJECT_FIELD,
    PRIORITY_FIELD,
    STATUS_FIELD,
    ACCOUNT_FIELD
];

export default class ServiceRequestCrud extends LightningElement {

    @api recordId;

    // Form values
    name = '';
    externalSystemId = '';
    subject = '';
    accountId = null;

    priority = 'Medium';
    status = 'New';

    // Picklist options
    priorityOptions = [];
    statusOptions = [];

    isSaving = false;
    deleted = false;
    createdRecordId = null;
    loadError = '';

    // Get default record type information
    @wire(getObjectInfo, {
        objectApiName: SERVICE_REQUEST_OBJECT
    })
    objectInfo;

    // Get Priority picklist values
    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: PRIORITY_FIELD
    })
    wiredPriorityValues({ data, error }) {

        if (data) {
            this.priorityOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Priority error:', error);
        }
    }

    // Get Status picklist values
    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: STATUS_FIELD
    })
    wiredStatusValues({ data, error }) {

        if (data) {
            this.statusOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Status error:', error);
        }
    }

    // Read existing record when recordId is supplied
    @wire(getRecord, {
        recordId: '$recordId',
        fields: REQUEST_FIELDS
    })
    wiredRequest({ data, error }) {

        if (data && !this.deleted) {

            this.name = getFieldValue(data, NAME_FIELD) || '';

            this.externalSystemId =
                getFieldValue(data, EXTERNAL_ID_FIELD) || '';

            this.subject =
                getFieldValue(data, SUBJECT_FIELD) || '';

            this.priority =
                getFieldValue(data, PRIORITY_FIELD) || null;

            this.status =
                getFieldValue(data, STATUS_FIELD) || null;

            this.accountId =
                getFieldValue(data, ACCOUNT_FIELD) || null;

        } else if (error && !this.deleted) {

            this.loadError = this.getErrorMessage(error);
        }
    }

    // Get the current record ID
    get activeRecordId() {
        return this.deleted
            ? null
            : (this.recordId || this.createdRecordId);
    }

    get isEditMode() {
        return Boolean(this.activeRecordId);
    }

    get canDelete() {
        return Boolean(this.activeRecordId);
    }

    get saveButtonLabel() {
        return this.isEditMode
            ? 'Update Service Request'
            : 'Create Service Request';
    }

    // Handle text and picklist changes
    handleInputChange(event) {

        const fieldName = event.target.name;

        this[fieldName] = event.target.value;
    }

    // Handle Account lookup selection
    handleAccountChange(event) {

        this.accountId = event.detail.recordId || null;
    }

    // Create or Update
    async handleSave() {

        const controls = [
            ...this.template.querySelectorAll(
                'lightning-input, lightning-combobox'
            )
        ];

        const isValid = controls.reduce((valid, control) => {

            control.reportValidity();

            return control.checkValidity() && valid;

        }, true);

        if (!isValid) {
            return;
        }

        this.isSaving = true;

        const fields = {};

        fields[NAME_FIELD.fieldApiName] = this.name.trim();

        fields[EXTERNAL_ID_FIELD.fieldApiName] =
            this.externalSystemId.trim();

        fields[SUBJECT_FIELD.fieldApiName] =
            this.subject || null;

        fields[PRIORITY_FIELD.fieldApiName] =
            this.priority || null;

        fields[STATUS_FIELD.fieldApiName] =
            this.status || null;

        fields[ACCOUNT_FIELD.fieldApiName] =
            this.accountId || null;

        try {

            if (this.activeRecordId) {

                // UPDATE existing record
                fields[ID_FIELD.fieldApiName] =
                    this.activeRecordId;

                await updateRecord({ fields });

                this.showToast(
                    'Success',
                    'Service Request updated successfully.',
                    'success'
                );

            } else {

                // CREATE new record
                const result = await createRecord({

                    apiName: SERVICE_REQUEST_OBJECT.objectApiName,

                    fields

                });

                this.createdRecordId = result.id;
                this.deleted = false;

                this.showToast(
                    'Success',
                    `Service Request created. ID: ${result.id}`,
                    'success'
                );
            }

        } catch (error) {

            this.showToast(
                'Error',
                this.getErrorMessage(error),
                'error'
            );

        } finally {

            this.isSaving = false;
        }
    }

    // DELETE existing record
    async handleDelete() {

        const id = this.activeRecordId;

        if (!id) {
            return;
        }

        this.isSaving = true;

        try {

            await deleteRecord(id);

            this.deleted = true;
            this.createdRecordId = null;

            this.name = '';
            this.externalSystemId = '';
            this.subject = '';
            this.accountId = null;
            this.priority = 'Medium';
            this.status = 'New';

            this.showToast(
                'Success',
                'Service Request deleted successfully.',
                'success'
            );

        } catch (error) {

            this.showToast(
                'Error',
                this.getErrorMessage(error),
                'error'
            );

        } finally {

            this.isSaving = false;
        }
    }

    // Display toast messages
    showToast(title, message, variant) {

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    // Simple error message helper
    getErrorMessage(error) {

        if (Array.isArray(error?.body)) {
            return error.body.map(item => item.message).join(', ');
        }

        return error?.body?.message
            || error?.body?.output?.errors?.map(
                item => item.message
            ).join(', ')
            || error?.message
            || 'An unexpected error occurred.';
    }
}