function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create 'Students' sheet if it doesn't exist
  if (!ss.getSheetByName('Students')) {
    const sheet = ss.insertSheet('Students');
    sheet.appendRow(['ID', 'Name', 'Timestamp']);
  }
  
  // Create 'Activities' sheet if it doesn't exist
  if (!ss.getSheetByName('Activities')) {
    const sheet = ss.insertSheet('Activities');
    sheet.appendRow(['ID', 'Name', 'Amount', 'Timestamp']);
  }
  
  // Create 'Payments' sheet if it doesn't exist
  if (!ss.getSheetByName('Payments')) {
    const sheet = ss.insertSheet('Payments');
    sheet.appendRow(['ID', 'ActivityID', 'StudentID', 'ImageBase64', 'Timestamp']);
  }
  
  // Create 'Exemptions' sheet if it doesn't exist
  if (!ss.getSheetByName('Exemptions')) {
    const sheet = ss.insertSheet('Exemptions');
    sheet.appendRow(['ID', 'ActivityID', 'StudentID', 'Reason', 'Timestamp']);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ensure setup is run at least once
  if (!ss.getSheetByName('Students')) {
    setup();
  }
  
  const response = {
    status: 'success',
    data: {
      students: getSheetData('Students'),
      activities: getSheetData('Activities'),
      payments: getSheetData('Payments'),
      exemptions: getSheetData('Exemptions')
    }
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only headers or empty
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function doPost(e) {
  try {
    let action = e.parameter.action;
    let data;
    
    // Some POST requests might send data as JSON string in the body
    if (e.postData && e.postData.contents) {
      try {
        const bodyData = JSON.parse(e.postData.contents);
        data = bodyData;
        if (bodyData.action && !action) action = bodyData.action;
      } catch (err) {
        // Not JSON
      }
    }
    
    // Allow overriding from parameter if needed
    if (!data) data = e.parameter;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet;
    
    if (action === 'addActivity') {
      sheet = ss.getSheetByName('Activities');
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.name, data.amount, new Date()]);
      return createSuccessResponse({ id: id, name: data.name, amount: data.amount });
      
    } else if (action === 'addStudents') {
      sheet = ss.getSheetByName('Students');
      const names = JSON.parse(data.names); // expect an array of strings
      const added = [];
      names.forEach(name => {
        const id = Utilities.getUuid();
        sheet.appendRow([id, name, new Date()]);
        added.push({id: id, name: name});
      });
      return createSuccessResponse(added);
      
    } else if (action === 'addPayment') {
      sheet = ss.getSheetByName('Payments');
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.activityId, data.studentId, data.imageBase64, new Date()]);
      return createSuccessResponse({ id: id, activityId: data.activityId, studentId: data.studentId });
      
    } else if (action === 'addExemption') {
      sheet = ss.getSheetByName('Exemptions');
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.activityId, data.studentId, data.reason, new Date()]);
      return createSuccessResponse({ id: id, activityId: data.activityId, studentId: data.studentId });
      
    } else if (action === 'toggleActivityStatus') {
      sheet = ss.getSheetByName('Activities');
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const idIndex = values[0].indexOf('ID');
      let statusIndex = values[0].indexOf('Status');
      
      // If Status column doesn't exist, create it dynamically
      if (statusIndex === -1) {
        statusIndex = values[0].length;
        sheet.getRange(1, statusIndex + 1).setValue('Status');
      }
      
      let updatedStatus = 'active';
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIndex] === data.activityId) {
          const currentStatus = values[i][statusIndex];
          updatedStatus = (currentStatus === 'paused') ? 'active' : 'paused';
          sheet.getRange(i + 1, statusIndex + 1).setValue(updatedStatus);
          break;
        }
      }
      return createSuccessResponse({ id: data.activityId, status: updatedStatus });
      
    } else {
      return createErrorResponse('Invalid action');
    }
    
  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Function to allow CORS for preflight requests (OPTIONS method)
function doOptions(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
  
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}
