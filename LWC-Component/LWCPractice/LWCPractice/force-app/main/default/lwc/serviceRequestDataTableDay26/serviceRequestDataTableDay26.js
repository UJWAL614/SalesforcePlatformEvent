import { LightningElement, wire  } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRequests from '@salesforce/apex/ServiceRequestDatatableDay26Controller.getServiceRequestList';

export default class ServiceRequestDataTableDay26 
    extends LightningElement {
        allRecords=[];
        visibleRecords=[];
        filteredRecords =[];
        searchKey ='';

        currentPage =1;
        pageSize = 5;
        sortedBy ='Name';
        sortDirection='desc';
        columns =[
            {
                label: 'Name',
                fieldName: 'Name',
                sortable: true
            },
            {
                label: 'Priority',
                fieldName: 'Priority__c',
                sortable: true
            },
            {
                label: 'Subject',
                fieldName: 'Subject__c',
                sortable: true
            },
            {
                label: 'Category',
                fieldName: 'Category__c',
                sortable: true
            },
        ];
     @wire(getRequests)
    wireRequests({ data, error }) {
        if (data) {
            this.allRecords = data;
            this.filteredRecords = [...data];
            this.updatePagination();
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Service Error',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
        }
    }
    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();
       this.filteredRecords = this.allRecords.filter(record => {

            return (
                (record.Name || '').toLowerCase()
                    .includes(this.searchKey) ||

                (record.Subject__c || '').toLowerCase()
                    .includes(this.searchKey)
            );
        });
         this.currentPage = 1;
        this.updatePagination();
    }
    // 2. Search records
    handleSort(event){
        this.sortedBy = event.detail.fieldName;
        this.sortDirection = event.detail.sortDirection;
        const fieldName = this.sortedBy;
        const sortedData = [...this.filteredRecords];
        sortedData.sort((a,b) =>{
            let valueA  =  a[fieldName] || "";
            let valueB = b[fieldName] || "";
            
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();

            let result = valueA> valueB ? 1 : -1;
            return this.sortDirection === 'asc'
                ? result
                : -result;

        }
        )
        this.filteredRecords = sortedData;

        this.updatePagination();
    }
     // 4. Calculate pagination
     get totalPages (){
         return Math.max(
            1,
            Math.ceil(this.filteredRecords.length / this.pageSize)
        ); 
     }
     updatePagination()
     {
        const  startIndex = (this.currentPage -1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
       this.visibleRecords =
            this.filteredRecords.slice(startIndex, endIndex);
     }

// 5. Previous page
    handlePrevious() {

        if (this.currentPage > 1) {

            this.currentPage--;

            this.updatePagination();
        }
    }

    // 6. Next page
    handleNext() {

        if (this.currentPage < this.totalPages) {

            this.currentPage++;

            this.updatePagination();
        }
    }

    get isPreviousDisabled() {
        return this.currentPage <= 1;
    }

    get isNextDisabled() {
        return this.currentPage >= this.totalPages;
    }
}