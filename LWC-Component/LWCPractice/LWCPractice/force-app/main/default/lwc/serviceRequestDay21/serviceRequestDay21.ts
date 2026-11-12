import { LightningElement, wire } from 'lwc';
import getServiceRequests from '@salesforce/apex/ServiceRequestDay21Controller.getServiceRequests';
import createServiceRequest from '@salesforce/apex/ServiceRequestDay21Controller.createServiceRequest';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

interface ServiceRequest {
    Id: string;
    Name: string;
    External_System_ID__c?: string;
    Subject__c?: string;
    Priority__c?: string;
    Status__c?: string;
}

interface ServiceRequestInput {
    Name: string;
    External_System_ID__c: string;
    Account__c: string;
    Subject__c: string;
    Priority__c: string;
    Status__c: string;
}

interface ApexError {
    body?: { message?: string } | Array<{ message: string }>;
}

interface WireResult<T> {
    data?: T;
    error?: ApexError;
}

interface Option {
    label: string;
    value: string;
}

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export default class ServiceRequestDay21 extends LightningElement {
    name: string = '';
    externalId: string = '';
    accountId: string = '';
    subject: string = '';
    priority: string = 'Medium';
    status: string = 'New';

    serviceRequests?: ServiceRequest[];
    errorMessage: string = '';
    isSaving: boolean = false;

    wiredRequestResult?: WireResult<ServiceRequest[]>;

    columns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'External ID', fieldName: 'External_System_ID__c' },
        { label: 'Subject', fieldName: 'Subject__c' },
        { label: 'Priority', fieldName: 'Priority__c' },
        { label: 'Status', fieldName: 'Status__c' }
    ];

    priorityOptions: Option[] = [
        { label: 'Low', value: 'Low' },
        { label: 'Medium', value: 'Medium' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' }
    ];

    statusOptions: Option[] = [
        { label: 'New', value: 'New' },
        { label: 'Assigned', value: 'Assigned' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Waiting', value: 'Waiting' },
        { label: 'Resolved', value: 'Resolved' },
        { label: 'Closed', value: 'Closed' }
    ];

    // Load data using @wire
    @wire(getServiceRequests)
    wiredRequests(result: WireResult<ServiceRequest[]>): void {
        this.wiredRequestResult = result;

        if (result.data) {
            this.serviceRequests = result.data;
            this.errorMessage = '';
        } else if (result.error) {
            this.errorMessage = this.getErrorMessage(result.error);
        }
    }

    handleNameChange(event: Event): void {
        this.name = (event.target as HTMLInputElement).value;
    }

    handleExternalIdChange(event: Event): void {
        this.externalId = (event.target as HTMLInputElement).value;
    }

    handleAccountChange(event: Event): void {
        this.accountId = (event.target as HTMLInputElement).value;
    }

    handleSubjectChange(event: Event): void {
        this.subject = (event.target as HTMLInputElement).value;
    }

    handlePriorityChange(event: CustomEvent<{ value: string }>): void {
        this.priority = event.detail.value;
    }

    handleStatusChange(event: CustomEvent<{ value: string }>): void {
        this.status = event.detail.value;
    }

    // Save using imperative Apex
    async handleSave(): Promise<void> {
        this.isSaving = true;

        const requestData: ServiceRequestInput = {
            Name: this.name,
            External_System_ID__c: this.externalId,
            Account__c: this.accountId,
            Subject__c: this.subject,
            Priority__c: this.priority,
            Status__c: this.status
        };

        try {
            const recordId: string = await createServiceRequest({ requestData });

            this.showToast(
                'Success',
                'Service Request created. Record ID: ' + recordId,
                'success'
            );

            this.clearForm();

            // Refresh the data shown by @wire
            await refreshApex(this.wiredRequestResult);
        } catch (error) {
            this.showToast('Error', this.getErrorMessage(error as ApexError), 'error');
        } finally {
            this.isSaving = false;
        }
    }

    async handleRefresh(): Promise<void> {
        try {
            await refreshApex(this.wiredRequestResult);
            this.showToast('Success', 'Service Request list refreshed.', 'success');
        } catch (error) {
            this.showToast('Error', this.getErrorMessage(error as ApexError), 'error');
        }
    }

    clearForm(): void {
        this.name = '';
        this.externalId = '';
        this.accountId = '';
        this.subject = '';
        this.priority = 'Medium';
        this.status = 'New';
    }

    getErrorMessage(error: ApexError): string {
        const body = error?.body;

        if (Array.isArray(body)) {
            return body.map((item) => item.message).join(', ');
        }

        if (body && body.message) {
            return body.message;
        }

        return 'An unexpected error occurred.';
    }

   showToast(title: string, message: string, variant: ToastVariant): void {
    (this as unknown as EventTarget).dispatchEvent(
        new ShowToastEvent({
            title,
            message,
            variant
        })
    );
}
}