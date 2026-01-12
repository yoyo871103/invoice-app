// Global variables
let currentItems = [];
let customers = [];
let workLocations = [];
let invoices = [];
let settings = {};
let currentEditingCustomerId = null;
let currentEditingLocationId = null;
let currentPdfUrl = null;
let currentEditingInvoiceId = null;
let currentEditingItemId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    initializeApp();
    showSection('invoice');
});

// === DATA MANAGEMENT ===
function loadAllData() {
    // Load customers
    const savedCustomers = localStorage.getItem('invoice_customers');
    customers = savedCustomers ? JSON.parse(savedCustomers) : [];
    
    // Load work locations
    const savedLocations = localStorage.getItem('invoice_locations');
    workLocations = savedLocations ? JSON.parse(savedLocations) : [];
    
    // Load invoices
    const savedInvoices = localStorage.getItem('invoice_invoices');
    invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    
    // Load settings
    const savedSettings = localStorage.getItem('invoice_settings');
    settings = savedSettings ? JSON.parse(savedSettings) : {
        businessName: 'HVAC Services Inc.',
        businessSlogan: 'Your Comfort is Our Priority',
        businessAddress: '123 Main Street, City, State 12345',
        businessPhone: '(555) 123-4567',
        businessEmail: 'info@hvacservices.com',
        businessTaxId: 'TAX-123456789',
        defaultTaxRate: 0,
        invoicePrefix: 'INV-'
    };
    
    updateDataStats();
}

function saveAllData() {
    localStorage.setItem('invoice_customers', JSON.stringify(customers));
    localStorage.setItem('invoice_locations', JSON.stringify(workLocations));
    localStorage.setItem('invoice_invoices', JSON.stringify(invoices));
    localStorage.setItem('invoice_settings', JSON.stringify(settings));
    updateDataStats();
}

function updateDataStats() {
    document.getElementById('customersCount').textContent = customers.length;
    document.getElementById('locationsCount').textContent = workLocations.length;
    document.getElementById('invoicesCount').textContent = invoices.length;
    
    // Calculate storage usage
    const totalSize = JSON.stringify(localStorage).length;
    document.getElementById('storageUsed').textContent = Math.round(totalSize / 1024) + ' KB';
}

// === NAVIGATION ===
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Activate corresponding nav button
    document.querySelector(`.nav-btn[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    // Section-specific initialization
    switch(sectionName) {
        case 'invoice':
            initializeInvoiceSection();
            break;
        case 'customers':
            initializeCustomersSection();
            break;
        case 'workLocations':
            initializeWorkLocationsSection();
            break;
        case 'history':
            initializeHistorySection();
            break;
        case 'settings':
            initializeSettingsSection();
            break;
    }
}

// === INVOICE SECTION ===
function initializeInvoiceSection() {
    loadCustomerSelect();
    loadWorkLocationSelect();
    
    // Only reset date and number if not editing
    if (!currentEditingInvoiceId) {
        document.getElementById('invoiceDate').valueAsDate = new Date();
        generateInvoiceNumber();
        document.getElementById('taxRate').value = settings.defaultTaxRate || 0;
    }
    
    calculateTotal();
    document.getElementById('shareBtn').style.display = 'none';
    
    // Update UI for editing mode if applicable
    showEditingMode();
}

function loadCustomerSelect() {
    const select = document.getElementById('customerSelect');
    select.innerHTML = '<option value="">Select customer...</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        select.appendChild(option);
    });
}

function loadWorkLocationSelect() {
    const select = document.getElementById('workLocationSelect');
    select.innerHTML = '<option value="">Select work location...</option>';
    select.innerHTML += '<option value="new">+ Add New Location</option>';
    
    workLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = location.name;
        select.appendChild(option);
    });
}

function loadCustomerData() {
    const select = document.getElementById('customerSelect');
    const customerId = parseInt(select.value);
    const customer = customers.find(c => c.id === customerId);
    
    if (customer) {
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
    }
}

function loadWorkLocationData() {
    const select = document.getElementById('workLocationSelect');
    const locationId = select.value;
    
    if (locationId === 'new') {
        showSection('workLocations');
        return;
    }
    
    const location = workLocations.find(l => l.id === parseInt(locationId));
    
    if (location) {
        document.getElementById('workLocationName').value = location.name;
        document.getElementById('workLocationAddress').value = location.address || '';
        document.getElementById('workLocationCity').value = location.city || '';
        document.getElementById('workLocationState').value = location.state || '';
        document.getElementById('workLocationZip').value = location.zip || '';
    }
}

function generateInvoiceNumber() {
    const prefix = settings.invoicePrefix || 'INV-';
    const number = invoices.filter(inv => inv.status === 'completed').length + 1;
    document.getElementById('invoiceNumber').value = prefix + number.toString().padStart(4, '0');
}

function addItem() {
    const description = document.getElementById('itemDescription').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const price = parseFloat(document.getElementById('itemPrice').value);

    if (!description || !quantity || !price) {
        alert('Please fill all item fields');
        return;
    }

    const item = {
        id: Date.now(),
        description,
        quantity,
        price,
        amount: quantity * price
    };

    currentItems.push(item);
    updateItemsList();
    calculateTotal();
    
    // Clear form
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemPrice').value = '';
}

function removeItem(itemId) {
    currentItems = currentItems.filter(item => item.id !== itemId);
    updateItemsList();
    calculateTotal();
}

function updateItemsList() {
    const list = document.getElementById('itemsList');
    list.innerHTML = '';

    if (currentItems.length === 0) {
        list.innerHTML = '<div class="item"><span>No items added</span></div>';
        return;
    }

    currentItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div class="item-info">
                <div class="item-description">${item.description}</div>
                <div class="item-numbers">
                    <span>Qty: ${item.quantity}</span>
                    <span>Price: $${item.price.toFixed(2)}</span>
                    <span>Amount: $${item.amount.toFixed(2)}</span>
                </div>
            </div>
            <div class="item-actions">
                <button onclick="editItem(${item.id})" class="btn secondary">Edit</button>
                <button onclick="removeItem(${item.id})" class="btn danger">Remove</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editItem(itemId) {
    const item = currentItems.find(i => i.id === itemId);
    if (item) {
        currentEditingItemId = itemId;
        document.getElementById('itemDescription').value = item.description;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemPrice').value = item.price;
        
        // Add editing class to form
        document.querySelector('.item-form').classList.add('editing');
        
        // Change the add button to update button
        const addBtn = document.querySelector('.item-form button:not(#cancelItemEdit)');
        addBtn.textContent = 'Update Item';
        addBtn.onclick = updateItem;
        
        // Show cancel button
        showItemCancelButton();
        
        // Scroll to item form
        document.querySelector('.item-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updateItem() {
    const description = document.getElementById('itemDescription').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const price = parseFloat(document.getElementById('itemPrice').value);

    if (!description || !quantity || !price) {
        alert('Please fill all item fields');
        return;
    }

    const itemIndex = currentItems.findIndex(i => i.id === currentEditingItemId);
    if (itemIndex !== -1) {
        currentItems[itemIndex] = {
            ...currentItems[itemIndex],
            description,
            quantity,
            price,
            amount: quantity * price
        };
    }

    resetItemForm();
    updateItemsList();
    calculateTotal();
}

function resetItemForm() {
    currentEditingItemId = null;
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemPrice').value = '';
    
    // Remove editing class from form
    document.querySelector('.item-form').classList.remove('editing');
    
    // Reset button to add
    const addBtn = document.querySelector('.item-form button:not(#cancelItemEdit)');
    addBtn.textContent = 'Add Item';
    addBtn.onclick = addItem;
    
    // Remove cancel button if exists
    hideItemCancelButton();
}

function showItemCancelButton() {
    let cancelBtn = document.getElementById('cancelItemEdit');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelItemEdit';
        cancelBtn.className = 'btn secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = resetItemForm;
        document.querySelector('.item-form').appendChild(cancelBtn);
    }
}

function hideItemCancelButton() {
    const cancelBtn = document.getElementById('cancelItemEdit');
    if (cancelBtn) {
        cancelBtn.remove();
    }
}

function calculateTotal() {
    const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('taxAmount').textContent = taxAmount.toFixed(2);
    document.getElementById('totalAmount').textContent = total.toFixed(2);
}

function clearInvoice() {
    if (confirm('Are you sure you want to clear the current invoice?')) {
        currentEditingInvoiceId = null;
        currentEditingItemId = null;
        clearInvoiceForm();
        hideEditingMode();
        resetItemForm();
    }
}

function saveDraft() {
    const invoiceData = getInvoiceData();
    if (!validateInvoice(invoiceData)) return;

    invoiceData.status = 'draft';
    invoiceData.id = Date.now();
    invoices.unshift(invoiceData);
    saveAllData();
    
    alert('Draft saved successfully!');
}

function generatePDF() {
    const invoiceData = getInvoiceData();
    if (!validateInvoice(invoiceData)) return;

    const { jsPDF } = window.jspdf;
    
    // Create PDF in landscape orientation
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Set margins and starting positions
    const margin = 15;
    let y = margin;

    // HEADER SECTION
    // Logo (AC unit representation)
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin, y, 20, 20, 3, 3, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 5, y + 5, 10, 10, 2, 2, 'F');
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin + 7, y + 7, 6, 6, 1, 1, 'F');

    // Company info (centered)
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 128);
    const companyName = settings.businessName || 'HVAC Services Inc.';
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(companyName, pageWidth / 2, y + 8, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const slogan = settings.businessSlogan || 'Your Comfort is Our Priority';
    doc.text(slogan, pageWidth / 2, y + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const address = settings.businessAddress || '123 Main Street, City, State 12345';
    doc.text(address, pageWidth / 2, y + 21, { align: 'center' });
    
    const phone = settings.businessPhone || '(555) 123-4567';
    doc.text(`Phone: ${phone}`, pageWidth / 2, y + 26, { align: 'center' });
    
    const email = settings.businessEmail || 'info@hvacservices.com';
    doc.text(`Email: ${email}`, pageWidth / 2, y + 31, { align: 'center' });

    // Invoice number and date (right side)
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`INVOICE: ${invoiceData.number}`, pageWidth - margin, y + 8, { align: 'right' });
    doc.text(`DATE: ${new Date(invoiceData.date).toLocaleDateString()}`, pageWidth - margin, y + 15, { align: 'right' });

    y = 50;

    // CLIENT AND WORK LOCATION SECTION
    // Client information (left side)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 128);
    doc.text('BILL TO:', margin, y);
    doc.setDrawColor(0, 122, 204);
    doc.line(margin, y + 2, margin + 40, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoiceData.customerName, margin, y + 8);
    if (invoiceData.customerAddress) doc.text(invoiceData.customerAddress, margin, y + 13);
    if (invoiceData.customerPhone) doc.text(`Phone: ${invoiceData.customerPhone}`, margin, y + 18);
    if (invoiceData.customerEmail) doc.text(`Email: ${invoiceData.customerEmail}`, margin, y + 23);

    // Work location (right side)
    const workLocationX = pageWidth / 2 + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 128);
    doc.text('WORK LOCATION:', workLocationX, y);
    doc.line(workLocationX, y + 2, workLocationX + 50, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoiceData.workLocationName, workLocationX, y + 8);
    if (invoiceData.workLocationAddress) doc.text(invoiceData.workLocationAddress, workLocationX, y + 13);
    if (invoiceData.workLocationCity) doc.text(`City: ${invoiceData.workLocationCity}`, workLocationX, y + 18);
    if (invoiceData.workLocationState) doc.text(`State: ${invoiceData.workLocationState}`, workLocationX, y + 23);
    if (invoiceData.workLocationZip) doc.text(`Zip: ${invoiceData.workLocationZip}`, workLocationX, y + 28);

    y = 85;

    // ITEMS TABLE HEADER
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION', margin + 5, y + 5);
    doc.text('QTY', pageWidth - margin - 100, y + 5);
    doc.text('PRICE', pageWidth - margin - 70, y + 5);
    doc.text('AMOUNT', pageWidth - margin - 30, y + 5);

    y += 15;

    // ITEMS
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    invoiceData.items.forEach((item, index) => {
        if (y > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            y = margin;
        }
        
        // Split long descriptions into multiple lines
        const descriptionLines = doc.splitTextToSize(item.description, pageWidth - 2 * margin - 80);
        
        // Calculate height needed for this item
        const lineHeight = 4;
        const itemHeight = Math.max(descriptionLines.length * lineHeight, 10);
        
        // Draw item background for better readability
        if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 2, pageWidth - 2 * margin, itemHeight + 2, 'F');
        }
        
        // Description (with multiple lines)
        doc.setTextColor(0, 0, 0);
        doc.text(descriptionLines, margin + 5, y);
        
        // Quantity, Price, Amount (aligned to the right)
        doc.text(item.quantity.toString(), pageWidth - margin - 100, y);
        doc.text(`$${item.price.toFixed(2)}`, pageWidth - margin - 70, y);
        doc.text(`$${item.amount.toFixed(2)}`, pageWidth - margin - 30, y);
        
        y += itemHeight + 5;
    });

    // TOTALS SECTION
    y = Math.max(y, doc.internal.pageSize.getHeight() - 40);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - margin - 100, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.text('Subtotal:', pageWidth - margin - 70, y);
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });
    
    y += 6;
    doc.text(`Tax (${invoiceData.taxRate}%):`, pageWidth - margin - 70, y);
    doc.text(`$${invoiceData.taxAmount.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });
    
    y += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 128);
    doc.text('TOTAL:', pageWidth - margin - 70, y);
    doc.text(`$${invoiceData.total.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });

    // FOOTER
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    // Save or update invoice data
    invoiceData.status = 'completed';
    invoiceData.pdfGenerated = new Date().toISOString();
    
    if (currentEditingInvoiceId) {
        // Update existing invoice
        const invoiceIndex = invoices.findIndex(inv => inv.id === currentEditingInvoiceId);
        if (invoiceIndex !== -1) {
            invoiceData.id = currentEditingInvoiceId;
            invoiceData.updatedAt = new Date().toISOString();
            invoices[invoiceIndex] = invoiceData;
        }
        currentEditingInvoiceId = null;
        hideEditingMode();
    } else {
        // Create new invoice
        invoiceData.id = Date.now();
        invoices.unshift(invoiceData);
    }
    saveAllData();

    // Save PDF for sharing
    const pdfBlob = doc.output('blob');
    currentPdfUrl = URL.createObjectURL(pdfBlob);
    
    // Show share button
    document.getElementById('shareBtn').style.display = 'inline-block';

    // Download PDF
    doc.save(`invoice-${invoiceData.number}.pdf`);
    
    clearInvoice();
    alert(`Invoice ${invoiceData.number} generated successfully!`);
}

function shareInvoice() {
    if (!currentPdfUrl) {
        alert('No invoice available to share. Please generate an invoice first.');
        return;
    }

    if (navigator.share) {
        const invoiceData = getInvoiceData();
        const fileName = `invoice-${invoiceData.number}.pdf`;
        
        fetch(currentPdfUrl)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], fileName, { type: 'application/pdf' });
                
                navigator.share({
                    title: `Invoice ${invoiceData.number}`,
                    text: `Invoice for ${invoiceData.customerName}`,
                    files: [file]
                })
                .then(() => console.log('Share successful'))
                .catch(error => {
                    console.log('Error sharing:', error);
                    // Fallback to download
                    const link = document.createElement('a');
                    link.href = currentPdfUrl;
                    link.download = fileName;
                    link.click();
                });
            });
    } else {
        alert('Sharing not supported in this browser. The invoice has been downloaded instead.');
        // Fallback to download
        const invoiceData = getInvoiceData();
        const link = document.createElement('a');
        link.href = currentPdfUrl;
        link.download = `invoice-${invoiceData.number}.pdf`;
        link.click();
    }
}

function getInvoiceData() {
    const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
        number: document.getElementById('invoiceNumber').value,
        date: document.getElementById('invoiceDate').value,
        customerName: document.getElementById('customerName').value,
        customerAddress: document.getElementById('customerAddress').value,
        customerPhone: document.getElementById('customerPhone').value,
        customerEmail: document.getElementById('customerEmail').value,
        workLocationName: document.getElementById('workLocationName').value,
        workLocationAddress: document.getElementById('workLocationAddress').value,
        workLocationCity: document.getElementById('workLocationCity').value,
        workLocationState: document.getElementById('workLocationState').value,
        workLocationZip: document.getElementById('workLocationZip').value,
        items: [...currentItems],
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: total
    };
}

function validateInvoice(invoiceData) {
    if (!invoiceData.customerName) {
        alert('Please enter customer name');
        return false;
    }
    
    if (!invoiceData.workLocationName) {
        alert('Please enter work location name');
        return false;
    }
    
    if (invoiceData.items.length === 0) {
        alert('Please add at least one item');
        return false;
    }
    
    if (!invoiceData.number) {
        alert('Please enter invoice number');
        return false;
    }
    
    return true;
}

// === CUSTOMERS SECTION ===
function initializeCustomersSection() {
    updateCustomersList();
    updateCustomerFilter();
}

function showNewCustomerForm() {
    currentEditingCustomerId = null;
    document.getElementById('customerForm').style.display = 'block';
    document.getElementById('customerFormTitle').textContent = 'Add New Customer';
    
    // Clear form
    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerPhone').value = '';
    document.getElementById('newCustomerEmail').value = '';
    document.getElementById('newCustomerAddress').value = '';
}

function hideCustomerForm() {
    document.getElementById('customerForm').style.display = 'none';
}

function saveCustomer() {
    const name = document.getElementById('newCustomerName').value;
    const phone = document.getElementById('newCustomerPhone').value;
    const email = document.getElementById('newCustomerEmail').value;
    const address = document.getElementById('newCustomerAddress').value;

    if (!name) {
        alert('Customer name is required');
        return;
    }

    if (currentEditingCustomerId) {
        // Update existing customer
        const index = customers.findIndex(c => c.id === currentEditingCustomerId);
        customers[index] = {
            ...customers[index],
            name,
            phone,
            email,
            address
        };
    } else {
        // Add new customer
        const newId = Math.max(...customers.map(c => c.id), 0) + 1;
        customers.push({
            id: newId,
            name,
            phone,
            email,
            address,
            created: new Date().toISOString()
        });
    }

    saveAllData();
    updateCustomersList();
    updateCustomerFilter();
    loadCustomerSelect();
    hideCustomerForm();
    
    alert('Customer saved successfully!');
}

function editCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        currentEditingCustomerId = customerId;
        document.getElementById('customerForm').style.display = 'block';
        document.getElementById('customerFormTitle').textContent = 'Edit Customer';
        
        document.getElementById('newCustomerName').value = customer.name;
        document.getElementById('newCustomerPhone').value = customer.phone || '';
        document.getElementById('newCustomerEmail').value = customer.email || '';
        document.getElementById('newCustomerAddress').value = customer.address || '';
    }
}

function deleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer?')) {
        customers = customers.filter(c => c.id !== customerId);
        saveAllData();
        updateCustomersList();
        updateCustomerFilter();
        loadCustomerSelect();
    }
}

function updateCustomersList() {
    const list = document.getElementById('customersList');
    list.innerHTML = '';

    if (customers.length === 0) {
        list.innerHTML = '<div class="customer-item"><span>No customers saved</span></div>';
        return;
    }

    customers.forEach(customer => {
        const div = document.createElement('div');
        div.className = 'customer-item';
        div.innerHTML = `
            <div class="customer-info">
                <strong>${customer.name}</strong>
                <div>
                    ${customer.phone ? `Phone: ${customer.phone}` : ''}
                    ${customer.email ? ` | Email: ${customer.email}` : ''}
                </div>
                ${customer.address ? `<div>Address: ${customer.address}</div>` : ''}
            </div>
            <div class="customer-actions">
                <button onclick="editCustomer(${customer.id})" class="btn secondary">Edit</button>
                <button onclick="deleteCustomer(${customer.id})" class="btn danger">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// === WORK LOCATIONS SECTION ===
function initializeWorkLocationsSection() {
    updateWorkLocationsList();
}

function showNewWorkLocationForm() {
    currentEditingLocationId = null;
    document.getElementById('workLocationForm').style.display = 'block';
    document.getElementById('workLocationFormTitle').textContent = 'Add New Work Location';
    
    // Clear form
    document.getElementById('newLocationName').value = '';
    document.getElementById('newLocationAddress').value = '';
    document.getElementById('newLocationCity').value = '';
    document.getElementById('newLocationState').value = '';
    document.getElementById('newLocationZip').value = '';
}

function hideWorkLocationForm() {
    document.getElementById('workLocationForm').style.display = 'none';
}

function saveWorkLocation() {
    const name = document.getElementById('newLocationName').value;
    const address = document.getElementById('newLocationAddress').value;
    const city = document.getElementById('newLocationCity').value;
    const state = document.getElementById('newLocationState').value;
    const zip = document.getElementById('newLocationZip').value;

    if (!name) {
        alert('Location name is required');
        return;
    }

    if (currentEditingLocationId) {
        // Update existing location
        const index = workLocations.findIndex(l => l.id === currentEditingLocationId);
        workLocations[index] = {
            ...workLocations[index],
            name,
            address,
            city,
            state,
            zip
        };
    } else {
        // Add new location
        const newId = Math.max(...workLocations.map(l => l.id), 0) + 1;
        workLocations.push({
            id: newId,
            name,
            address,
            city,
            state,
            zip,
            created: new Date().toISOString()
        });
    }

    saveAllData();
    updateWorkLocationsList();
    loadWorkLocationSelect();
    hideWorkLocationForm();
    
    alert('Work location saved successfully!');
}

function editWorkLocation(locationId) {
    const location = workLocations.find(l => l.id === locationId);
    if (location) {
        currentEditingLocationId = locationId;
        document.getElementById('workLocationForm').style.display = 'block';
        document.getElementById('workLocationFormTitle').textContent = 'Edit Work Location';
        
        document.getElementById('newLocationName').value = location.name;
        document.getElementById('newLocationAddress').value = location.address || '';
        document.getElementById('newLocationCity').value = location.city || '';
        document.getElementById('newLocationState').value = location.state || '';
        document.getElementById('newLocationZip').value = location.zip || '';
    }
}

function deleteWorkLocation(locationId) {
    if (confirm('Are you sure you want to delete this work location?')) {
        workLocations = workLocations.filter(l => l.id !== locationId);
        saveAllData();
        updateWorkLocationsList();
        loadWorkLocationSelect();
    }
}

function updateWorkLocationsList() {
    const list = document.getElementById('workLocationsList');
    list.innerHTML = '';

    if (workLocations.length === 0) {
        list.innerHTML = '<div class="location-item"><span>No work locations saved</span></div>';
        return;
    }

    workLocations.forEach(location => {
        const div = document.createElement('div');
        div.className = 'location-item';
        div.innerHTML = `
            <div class="location-info">
                <strong>${location.name}</strong>
                <div>${location.address || ''}</div>
                <div>${location.city || ''} ${location.state || ''} ${location.zip || ''}</div>
            </div>
            <div class="location-actions">
                <button onclick="editWorkLocation(${location.id})" class="btn secondary">Edit</button>
                <button onclick="deleteWorkLocation(${location.id})" class="btn danger">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// === HISTORY SECTION ===
function initializeHistorySection() {
    updateCustomerFilter();
    updateHistoryList();
}

function updateCustomerFilter() {
    const filter = document.getElementById('customerFilter');
    filter.innerHTML = '<option value="">All Customers</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        option.textContent = customer.name;
        filter.appendChild(option);
    });
}

function updateHistoryList() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (invoices.length === 0) {
        list.innerHTML = '<div class="history-item"><span>No invoices generated</span></div>';
        return;
    }

    invoices.forEach(invoice => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info">
                <strong>${invoice.number}</strong>
                <div>Date: ${new Date(invoice.date).toLocaleDateString()} | Customer: ${invoice.customerName}</div>
                <div>Work Location: ${invoice.workLocationName} | Total: $${invoice.total.toFixed(2)}</div>
                <div>Status: ${invoice.status || 'completed'}</div>
            </div>
            <div class="history-actions">
                <button onclick="editInvoice(${invoice.id})" class="btn secondary">Edit</button>
                <button onclick="downloadInvoice(${invoice.id})" class="btn primary">Download</button>
                <button onclick="shareInvoiceFromHistory(${invoice.id})" class="btn success">Share</button>
                <button onclick="deleteInvoice(${invoice.id})" class="btn danger">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found');
        return;
    }

    // Set editing mode
    currentEditingInvoiceId = invoiceId;

    // Load invoice data into form
    document.getElementById('invoiceNumber').value = invoice.number;
    document.getElementById('invoiceDate').value = invoice.date;
    document.getElementById('customerName').value = invoice.customerName;
    document.getElementById('customerAddress').value = invoice.customerAddress || '';
    document.getElementById('customerPhone').value = invoice.customerPhone || '';
    document.getElementById('customerEmail').value = invoice.customerEmail || '';
    document.getElementById('workLocationName').value = invoice.workLocationName;
    document.getElementById('workLocationAddress').value = invoice.workLocationAddress || '';
    document.getElementById('workLocationCity').value = invoice.workLocationCity || '';
    document.getElementById('workLocationState').value = invoice.workLocationState || '';
    document.getElementById('workLocationZip').value = invoice.workLocationZip || '';
    document.getElementById('taxRate').value = invoice.taxRate || 0;

    // Load items with new IDs to avoid conflicts
    currentItems = invoice.items.map(item => ({
        ...item,
        id: item.id || Date.now() + Math.random()
    }));

    updateItemsList();
    calculateTotal();

    // Update UI to show editing mode
    showEditingMode();

    // Switch to invoice section
    showSection('invoice');
}

function showEditingMode() {
    const sectionHeader = document.querySelector('#invoice .section-header h2');
    if (currentEditingInvoiceId) {
        sectionHeader.textContent = 'Edit Invoice';
        
        // Add cancel edit button if not exists
        let cancelEditBtn = document.getElementById('cancelInvoiceEdit');
        if (!cancelEditBtn) {
            cancelEditBtn = document.createElement('button');
            cancelEditBtn.id = 'cancelInvoiceEdit';
            cancelEditBtn.className = 'btn secondary';
            cancelEditBtn.textContent = 'Cancel Edit';
            cancelEditBtn.onclick = cancelInvoiceEdit;
            document.querySelector('#invoice .section-header').appendChild(cancelEditBtn);
        }
        
        // Change Save Draft button to Update Invoice
        const saveDraftBtn = document.querySelector('.actions button[onclick="saveDraft()"]');
        if (saveDraftBtn) {
            saveDraftBtn.textContent = 'Update Invoice';
            saveDraftBtn.onclick = updateInvoice;
        }
    } else {
        sectionHeader.textContent = 'Create New Invoice';
        hideEditingMode();
    }
}

function hideEditingMode() {
    const cancelEditBtn = document.getElementById('cancelInvoiceEdit');
    if (cancelEditBtn) {
        cancelEditBtn.remove();
    }
    
    // Reset Save Draft button
    const saveDraftBtn = document.querySelector('.actions button');
    if (saveDraftBtn && saveDraftBtn.textContent === 'Update Invoice') {
        saveDraftBtn.textContent = 'Save Draft';
        saveDraftBtn.onclick = saveDraft;
    }
    
    const sectionHeader = document.querySelector('#invoice .section-header h2');
    sectionHeader.textContent = 'Create New Invoice';
}

function cancelInvoiceEdit() {
    if (confirm('Are you sure you want to cancel editing? All changes will be lost.')) {
        currentEditingInvoiceId = null;
        clearInvoiceForm();
        hideEditingMode();
        showSection('history');
    }
}

function clearInvoiceForm() {
    currentItems = [];
    document.getElementById('customerSelect').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('workLocationSelect').value = '';
    document.getElementById('workLocationName').value = '';
    document.getElementById('workLocationAddress').value = '';
    document.getElementById('workLocationCity').value = '';
    document.getElementById('workLocationState').value = '';
    document.getElementById('workLocationZip').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemPrice').value = '';
    document.getElementById('taxRate').value = settings.defaultTaxRate || 0;
    
    updateItemsList();
    calculateTotal();
    generateInvoiceNumber();
    document.getElementById('shareBtn').style.display = 'none';
}

function updateInvoice() {
    const invoiceData = getInvoiceData();
    if (!validateInvoice(invoiceData)) return;

    // Find and update the existing invoice
    const invoiceIndex = invoices.findIndex(inv => inv.id === currentEditingInvoiceId);
    if (invoiceIndex !== -1) {
        invoiceData.id = currentEditingInvoiceId;
        invoiceData.status = invoices[invoiceIndex].status;
        invoiceData.updatedAt = new Date().toISOString();
        invoices[invoiceIndex] = invoiceData;
        
        saveAllData();
        
        currentEditingInvoiceId = null;
        clearInvoiceForm();
        hideEditingMode();
        
        alert('Invoice updated successfully!');
        showSection('history');
    }
}
function filterHistory() {
    const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
    const customerFilter = document.getElementById('customerFilter').value;
    
    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.number.toLowerCase().includes(searchTerm) || 
                            invoice.customerName.toLowerCase().includes(searchTerm) ||
                            invoice.workLocationName.toLowerCase().includes(searchTerm);
        const matchesCustomer = !customerFilter || invoice.customerName === customerFilter;
        
        return matchesSearch && matchesCustomer;
    });
    
    // Update display with filtered results
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    filteredInvoices.forEach(invoice => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info">
                <strong>${invoice.number}</strong>
                <div>Date: ${new Date(invoice.date).toLocaleDateString()} | Customer: ${invoice.customerName}</div>
                <div>Work Location: ${invoice.workLocationName} | Total: $${invoice.total.toFixed(2)}</div>
                <div>Status: ${invoice.status || 'completed'}</div>
            </div>
            <div class="history-actions">
                <button onclick="editInvoice(${invoice.id})" class="btn secondary">Edit</button>
                <button onclick="downloadInvoice(${invoice.id})" class="btn primary">Download</button>
                <button onclick="shareInvoiceFromHistory(${invoice.id})" class="btn success">Share</button>
                <button onclick="deleteInvoice(${invoice.id})" class="btn danger">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}
function downloadInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found');
        return;
    }

    const { jsPDF } = window.jspdf;
    
    // Create PDF in landscape orientation
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Set margins and starting positions
    const margin = 15;
    let y = margin;

    // HEADER SECTION
    // Logo (AC unit representation)
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin, y, 20, 20, 3, 3, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 5, y + 5, 10, 10, 2, 2, 'F');
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin + 7, y + 7, 6, 6, 1, 1, 'F');

    // Company info (centered)
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 128);
    const companyName = settings.businessName || 'HVAC Services Inc.';
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(companyName, pageWidth / 2, y + 8, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const slogan = settings.businessSlogan || 'Your Comfort is Our Priority';
    doc.text(slogan, pageWidth / 2, y + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const address = settings.businessAddress || '123 Main Street, City, State 12345';
    doc.text(address, pageWidth / 2, y + 21, { align: 'center' });
    
    const phone = settings.businessPhone || '(555) 123-4567';
    doc.text(`Phone: ${phone}`, pageWidth / 2, y + 26, { align: 'center' });
    
    const email = settings.businessEmail || 'info@hvacservices.com';
    doc.text(`Email: ${email}`, pageWidth / 2, y + 31, { align: 'center' });

    // Invoice number and date (right side)
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`INVOICE: ${invoice.number}`, pageWidth - margin, y + 8, { align: 'right' });
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - margin, y + 15, { align: 'right' });

    y = 50;

    // CLIENT AND WORK LOCATION SECTION
    // Client information (left side)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 128);
    doc.text('BILL TO:', margin, y);
    doc.setDrawColor(0, 122, 204);
    doc.line(margin, y + 2, margin + 40, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.customerName, margin, y + 8);
    if (invoice.customerAddress) doc.text(invoice.customerAddress, margin, y + 13);
    if (invoice.customerPhone) doc.text(`Phone: ${invoice.customerPhone}`, margin, y + 18);
    if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`, margin, y + 23);

    // Work location (right side)
    const workLocationX = pageWidth / 2 + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 128);
    doc.text('WORK LOCATION:', workLocationX, y);
    doc.line(workLocationX, y + 2, workLocationX + 50, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.workLocationName, workLocationX, y + 8);
    if (invoice.workLocationAddress) doc.text(invoice.workLocationAddress, workLocationX, y + 13);
    if (invoice.workLocationCity) doc.text(`City: ${invoice.workLocationCity}`, workLocationX, y + 18);
    if (invoice.workLocationState) doc.text(`State: ${invoice.workLocationState}`, workLocationX, y + 23);
    if (invoice.workLocationZip) doc.text(`Zip: ${invoice.workLocationZip}`, workLocationX, y + 28);

    y = 85;

    // ITEMS TABLE HEADER
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION', margin + 5, y + 5);
    doc.text('QTY', pageWidth - margin - 100, y + 5);
    doc.text('PRICE', pageWidth - margin - 70, y + 5);
    doc.text('AMOUNT', pageWidth - margin - 30, y + 5);

    y += 15;

    // ITEMS
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    invoice.items.forEach((item, index) => {
        if (y > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            y = margin;
        }
        
        // Split long descriptions into multiple lines
        const descriptionLines = doc.splitTextToSize(item.description, pageWidth - 2 * margin - 80);
        
        // Calculate height needed for this item
        const lineHeight = 4;
        const itemHeight = Math.max(descriptionLines.length * lineHeight, 10);
        
        // Draw item background for better readability
        if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 2, pageWidth - 2 * margin, itemHeight + 2, 'F');
        }
        
        // Description (with multiple lines)
        doc.setTextColor(0, 0, 0);
        doc.text(descriptionLines, margin + 5, y);
        
        // Quantity, Price, Amount (aligned to the right)
        doc.text(item.quantity.toString(), pageWidth - margin - 100, y);
        doc.text(`$${item.price.toFixed(2)}`, pageWidth - margin - 70, y);
        doc.text(`$${item.amount.toFixed(2)}`, pageWidth - margin - 30, y);
        
        y += itemHeight + 5;
    });

    // TOTALS SECTION
    y = Math.max(y, doc.internal.pageSize.getHeight() - 40);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - margin - 100, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.text('Subtotal:', pageWidth - margin - 70, y);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });
    
    y += 6;
    doc.text(`Tax (${invoice.taxRate}%):`, pageWidth - margin - 70, y);
    doc.text(`$${invoice.taxAmount.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });
    
    y += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 128);
    doc.text('TOTAL:', pageWidth - margin - 70, y);
    doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });

    // FOOTER
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    // Generate PDF as blob for both download and display
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // 1. DESCARGAR el PDF automáticamente
    const downloadLink = document.createElement('a');
    downloadLink.href = pdfUrl;
    downloadLink.download = `invoice-${invoice.number}.pdf`;
    downloadLink.click();
    
    // 2. ABRIR el PDF en una nueva pestaña para visualización
    setTimeout(() => {
        const viewLink = document.createElement('a');
        viewLink.href = pdfUrl;
        viewLink.target = '_blank';
        viewLink.click();
        
        // Limpiar la URL después de un tiempo
        setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
        }, 1000);
    }, 500);
    
    alert(`Invoice ${invoice.number} downloaded and opened for viewing!`);
}

function deleteInvoice(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        invoices = invoices.filter(inv => inv.id !== invoiceId);
        saveAllData();
        updateHistoryList();
    }
}

// === SETTINGS SECTION ===
function initializeSettingsSection() {
    // Load current settings into form
    document.getElementById('businessName').value = settings.businessName || '';
    document.getElementById('businessSlogan').value = settings.businessSlogan || '';
    document.getElementById('businessAddress').value = settings.businessAddress || '';
    document.getElementById('businessPhone').value = settings.businessPhone || '';
    document.getElementById('businessEmail').value = settings.businessEmail || '';
    document.getElementById('businessTaxId').value = settings.businessTaxId || '';
    document.getElementById('defaultTaxRate').value = settings.defaultTaxRate || 0;
    document.getElementById('invoicePrefix').value = settings.invoicePrefix || 'INV-';
}

function saveBusinessInfo() {
    settings.businessName = document.getElementById('businessName').value;
    settings.businessSlogan = document.getElementById('businessSlogan').value;
    settings.businessAddress = document.getElementById('businessAddress').value;
    settings.businessPhone = document.getElementById('businessPhone').value;
    settings.businessEmail = document.getElementById('businessEmail').value;
    settings.businessTaxId = document.getElementById('businessTaxId').value;
    
    saveAllData();
    alert('Business information saved successfully!');
}

function saveInvoiceSettings() {
    settings.defaultTaxRate = parseFloat(document.getElementById('defaultTaxRate').value) || 0;
    settings.invoicePrefix = document.getElementById('invoicePrefix').value;
    
    // Update current invoice tax rate if it's 0
    if (parseFloat(document.getElementById('taxRate').value) === 0) {
        document.getElementById('taxRate').value = settings.defaultTaxRate;
        calculateTotal();
    }
    
    saveAllData();
    alert('Invoice settings saved successfully!');
}

// === DATA EXPORT/IMPORT ===
function exportData() {
    const data = {
        customers,
        workLocations,
        invoices,
        settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-backup-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('This will replace all current data. Continue?')) {
                customers = data.customers || [];
                workLocations = data.workLocations || [];
                invoices = data.invoices || [];
                settings = data.settings || {};
                
                saveAllData();
                initializeApp();
                alert('Data imported successfully!');
            }
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

function clearAllData() {
    if (confirm('This will delete ALL data including customers, work locations and invoices. This action cannot be undone. Continue?')) {
        localStorage.clear();
        customers = [];
        workLocations = [];
        invoices = [];
        currentItems = [];
        
        // Reset to default settings
        settings = {
            businessName: 'HVAC Services Inc.',
            businessSlogan: 'Your Comfort is Our Priority',
            businessAddress: '123 Main Street, City, State 12345',
            businessPhone: '(555) 123-4567',
            businessEmail: 'info@hvacservices.com',
            businessTaxId: 'TAX-123456789',
            defaultTaxRate: 0,
            invoicePrefix: 'INV-'
        };
        
        saveAllData();
        initializeApp();
        alert('All data has been cleared.');
    }
}

function shareInvoiceFromHistory(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found');
        return;
    }

    // Regenerate the PDF for sharing
    const { jsPDF } = window.jspdf;
    
    // Create PDF in landscape orientation
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Set margins and starting positions
    const margin = 15;
    let y = margin;

    // HEADER SECTION
    // Logo (AC unit representation)
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin, y, 20, 20, 3, 3, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 5, y + 5, 10, 10, 2, 2, 'F');
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin + 7, y + 7, 6, 6, 1, 1, 'F');

    // Company info (centered)
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 128);
    const companyName = settings.businessName || 'HVAC Services Inc.';
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(companyName, pageWidth / 2, y + 8, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const slogan = settings.businessSlogan || 'Your Comfort is Our Priority';
    doc.text(slogan, pageWidth / 2, y + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const address = settings.businessAddress || '123 Main Street, City, State 12345';
    doc.text(address, pageWidth / 2, y + 21, { align: 'center' });
    
    const phone = settings.businessPhone || '(555) 123-4567';
    doc.text(`Phone: ${phone}`, pageWidth / 2, y + 26, { align: 'center' });
    
    const email = settings.businessEmail || 'info@hvacservices.com';
    doc.text(`Email: ${email}`, pageWidth / 2, y + 31, { align: 'center' });

    // Invoice number and date (right side)
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`INVOICE: ${invoice.number}`, pageWidth - margin, y + 8, { align: 'right' });
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - margin, y + 15, { align: 'right' });

    y = 50;

    // CLIENT AND WORK LOCATION SECTION
    // Client information (left side)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 128);
    doc.text('BILL TO:', margin, y);
    doc.setDrawColor(0, 122, 204);
    doc.line(margin, y + 2, margin + 40, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.customerName, margin, y + 8);
    if (invoice.customerAddress) doc.text(invoice.customerAddress, margin, y + 13);
    if (invoice.customerPhone) doc.text(`Phone: ${invoice.customerPhone}`, margin, y + 18);
    if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`, margin, y + 23);

    // Work location (right side)
    const workLocationX = pageWidth / 2 + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 128);
    doc.text('WORK LOCATION:', workLocationX, y);
    doc.line(workLocationX, y + 2, workLocationX + 50, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.workLocationName, workLocationX, y + 8);
    if (invoice.workLocationAddress) doc.text(invoice.workLocationAddress, workLocationX, y + 13);
    if (invoice.workLocationCity) doc.text(`City: ${invoice.workLocationCity}`, workLocationX, y + 18);
    if (invoice.workLocationState) doc.text(`State: ${invoice.workLocationState}`, workLocationX, y + 23);
    if (invoice.workLocationZip) doc.text(`Zip: ${invoice.workLocationZip}`, workLocationX, y + 28);

    y = 85;

    // ITEMS TABLE HEADER
    doc.setFillColor(0, 122, 204);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION', margin + 5, y + 5);
    doc.text('QTY', pageWidth - margin - 100, y + 5);
    doc.text('PRICE', pageWidth - margin - 70, y + 5);
    doc.text('AMOUNT', pageWidth - margin - 30, y + 5);

    y += 15;

    // ITEMS
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    invoice.items.forEach((item, index) => {
        if (y > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            y = margin;
        }
        
        // Split long descriptions into multiple lines
        const descriptionLines = doc.splitTextToSize(item.description, pageWidth - 2 * margin - 80);
        
        // Calculate height needed for this item
        const lineHeight = 4;
        const itemHeight = Math.max(descriptionLines.length * lineHeight, 10);
        
        // Draw item background for better readability
        if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 2, pageWidth - 2 * margin, itemHeight + 2, 'F');
        }
        
        // Description (with multiple lines)
        doc.setTextColor(0, 0, 0);
        doc.text(descriptionLines, margin + 5, y);
        
        // Quantity, Price, Amount (aligned to the right)
        doc.text(item.quantity.toString(), pageWidth - margin - 100, y);
        doc.text(`$${item.price.toFixed(2)}`, pageWidth - margin - 70, y);
        doc.text(`$${item.amount.toFixed(2)}`, pageWidth - margin - 30, y);
        
        y += itemHeight + 5;
    });

    // TOTALS SECTION
    y = Math.max(y, doc.internal.pageSize.getHeight() - 40);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - margin - 100, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.text('Subtotal:', pageWidth - margin - 70, y);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });
    
    y += 6;
    doc.text(`Tax (${invoice.taxRate}%):`, pageWidth - margin - 70, y);
    doc.text(`$${invoice.taxAmount.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });
    
    y += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 128);
    doc.text('TOTAL:', pageWidth - margin - 70, y);
    doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - margin - 30, y, { align: 'right' });

    // FOOTER
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    // Convert PDF to blob for sharing
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Share the PDF
    sharePDF(pdfUrl, invoice.number);
}

function sharePDF(pdfUrl, invoiceNumber) {
    if (navigator.share) {
        const fileName = `invoice-${invoiceNumber}.pdf`;
        
        fetch(pdfUrl)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], fileName, { type: 'application/pdf' });
                
                navigator.share({
                    title: `Invoice ${invoiceNumber}`,
                    text: `Invoice ${invoiceNumber}`,
                    files: [file]
                })
                .then(() => {
                    console.log('Share successful');
                    URL.revokeObjectURL(pdfUrl);
                })
                .catch(error => {
                    console.log('Error sharing:', error);
                    // Fallback: descargar y mostrar
                    downloadAndViewPDF(pdfUrl, fileName);
                });
            });
    } else {
        // Si no hay soporte para compartir, descargar y mostrar
        downloadAndViewPDF(pdfUrl, `invoice-${invoiceNumber}.pdf`);
    }
}

function downloadAndViewPDF(pdfUrl, fileName) {
    // Descargar
    const downloadLink = document.createElement('a');
    downloadLink.href = pdfUrl;
    downloadLink.download = fileName;
    downloadLink.click();
    
    // Mostrar en nueva pestaña
    setTimeout(() => {
        const viewLink = document.createElement('a');
        viewLink.href = pdfUrl;
        viewLink.target = '_blank';
        viewLink.click();
        
        setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
        }, 1000);
    }, 500);
}
function downloadPDF(pdfUrl, fileName) {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    link.click();
    // Clean up URL after a delay
    setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
    }, 1000);
}

// PWA Installation
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
const pwaStatus = document.getElementById('pwaStatus');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
    pwaStatus.textContent = 'App can be installed';
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                pwaStatus.textContent = 'App installed successfully!';
            } else {
                pwaStatus.textContent = 'App installation cancelled';
            }
            deferredPrompt = null;
            installBtn.style.display = 'none';
        });
    }
}

window.addEventListener('appinstalled', (evt) => {
    pwaStatus.textContent = 'App was successfully installed!';
    installBtn.style.display = 'none';
});


// === APP INITIALIZATION ===
function initializeApp() {
    loadAllData();
    initializeInvoiceSection();
    initializeCustomersSection();
    initializeWorkLocationsSection();
    initializeHistorySection();
    initializeSettingsSection();
}