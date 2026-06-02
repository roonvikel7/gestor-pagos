function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName('Students')) {
    const sheet = ss.insertSheet('Students');
    sheet.appendRow(['ID', 'Name', 'Password', 'Timestamp']);
  }
  
  if (!ss.getSheetByName('Activities')) {
    const sheet = ss.insertSheet('Activities');
    sheet.appendRow(['ID', 'Name', 'Amount', 'Timestamp', 'Status']);
  }
  
  if (!ss.getSheetByName('Payments')) {
    const sheet = ss.insertSheet('Payments');
    sheet.appendRow(['ID', 'ActivityID', 'StudentID', 'ImageBase64', 'Attempts', 'Timestamp']);
  }
  
  if (!ss.getSheetByName('Exemptions')) {
    const sheet = ss.insertSheet('Exemptions');
    sheet.appendRow(['ID', 'ActivityID', 'StudentID', 'Reason', 'Timestamp']);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
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
  if (data.length <= 1) return []; 
  
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

function getColumnIndex(sheet, colName) {
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return -1;
  let index = values[0].indexOf(colName);
  if (index === -1) {
    index = values[0].length;
    sheet.getRange(1, index + 1).setValue(colName);
  }
  return index;
}

function doPost(e) {
  try {
    let action = e.parameter.action;
    let data;
    
    if (e.postData && e.postData.contents) {
      try {
        const bodyData = JSON.parse(e.postData.contents);
        data = bodyData;
        if (bodyData.action && !action) action = bodyData.action;
      } catch (err) {}
    }
    
    if (!data) data = e.parameter;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet;
    
    if (action === 'addActivity') {
      sheet = ss.getSheetByName('Activities');
      const id = Utilities.getUuid();
      
      const idIdx = getColumnIndex(sheet, 'ID');
      const nameIdx = getColumnIndex(sheet, 'Name');
      const amountIdx = getColumnIndex(sheet, 'Amount');
      const timeIdx = getColumnIndex(sheet, 'Timestamp');
      const statusIdx = getColumnIndex(sheet, 'Status');
      const deadlineIdx = getColumnIndex(sheet, 'Deadline');
      
      const row = [];
      row[idIdx] = id;
      row[nameIdx] = data.name;
      row[amountIdx] = data.amount;
      row[timeIdx] = new Date();
      row[statusIdx] = 'active';
      row[deadlineIdx] = ''; 
      sheet.appendRow(row);
      
      return createSuccessResponse({ id: id, name: data.name, amount: data.amount });
      
    } else if (action === 'addStudents') {
      sheet = ss.getSheetByName('Students');
      const studentsList = JSON.parse(data.students); 
      const added = [];
      
      const idIdx = getColumnIndex(sheet, 'ID');
      const nameIdx = getColumnIndex(sheet, 'Name');
      const passIdx = getColumnIndex(sheet, 'Password');
      const timeIdx = getColumnIndex(sheet, 'Timestamp');
      
      studentsList.forEach(std => {
        const id = Utilities.getUuid();
        const row = [];
        row[idIdx] = id;
        row[nameIdx] = std.name;
        row[passIdx] = std.password;
        row[timeIdx] = new Date();
        sheet.appendRow(row);
        added.push({id: id, name: std.name, password: std.password});
      });
      return createSuccessResponse(added);
      
    } else if (action === 'generateMissingPasswords') {
      sheet = ss.getSheetByName('Students');
      const passIdx = getColumnIndex(sheet, 'Password');
      const passwordsDict = JSON.parse(data.passwordsDict);
      
      const values = sheet.getDataRange().getValues();
      const idIdx = values[0].indexOf('ID');
      
      let updated = 0;
      for (let i = 1; i < values.length; i++) {
        const sId = values[i][idIdx];
        if (passwordsDict[sId]) {
          sheet.getRange(i + 1, passIdx + 1).setValue(passwordsDict[sId]);
          updated++;
        }
      }
      return createSuccessResponse({ updated: updated });

    } else if (action === 'addPayment') {
      sheet = ss.getSheetByName('Payments');
      const actIdIdx = getColumnIndex(sheet, 'ActivityID');
      const stdIdIdx = getColumnIndex(sheet, 'StudentID');
      const imgIdx = getColumnIndex(sheet, 'ImageBase64');
      const attIdx = getColumnIndex(sheet, 'Attempts');
      const timeIdx = getColumnIndex(sheet, 'Timestamp');
      const idIdx = getColumnIndex(sheet, 'ID');
      
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      let currentAttempts = 0;
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][actIdIdx] === data.activityId && values[i][stdIdIdx] === data.studentId) {
          rowIndex = i + 1; 
          currentAttempts = Number(values[i][attIdx]) || 1; 
          break;
        }
      }
      
      if (rowIndex !== -1) {
        if (currentAttempts >= 3) {
          return createErrorResponse('Has superado el límite máximo de 3 intentos.');
        }
        sheet.getRange(rowIndex, imgIdx + 1).setValue(data.imageBase64);
        sheet.getRange(rowIndex, attIdx + 1).setValue(currentAttempts + 1);
        sheet.getRange(rowIndex, timeIdx + 1).setValue(new Date());
        return createSuccessResponse({ updated: true, attemptsUsed: currentAttempts + 1 });
      } else {
        const id = Utilities.getUuid();
        const row = [];
        row[idIdx] = id;
        row[actIdIdx] = data.activityId;
        row[stdIdIdx] = data.studentId;
        row[imgIdx] = data.imageBase64;
        row[attIdx] = 1;
        row[timeIdx] = new Date();
        sheet.appendRow(row);
        return createSuccessResponse({ id: id, activityId: data.activityId, studentId: data.studentId, attemptsUsed: 1 });
      }
      
    } else if (action === 'addExemption') {
      sheet = ss.getSheetByName('Exemptions');
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.activityId, data.studentId, data.reason, new Date()]);
      return createSuccessResponse({ id: id, activityId: data.activityId, studentId: data.studentId });
      
    } else if (action === 'toggleActivityStatus') {
      sheet = ss.getSheetByName('Activities');
      const idIdx = getColumnIndex(sheet, 'ID');
      const statusIdx = getColumnIndex(sheet, 'Status');
      
      const values = sheet.getDataRange().getValues();
      let updatedStatus = 'active';
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIdx] === data.activityId) {
          const currentStatus = values[i][statusIdx];
          updatedStatus = (currentStatus === 'paused') ? 'active' : 'paused';
          sheet.getRange(i + 1, statusIdx + 1).setValue(updatedStatus);
          break;
        }
      }
      return createSuccessResponse({ id: data.activityId, status: updatedStatus });
      
    } else if (action === 'deleteActivity') {
      sheet = ss.getSheetByName('Activities');
      const idIdx = getColumnIndex(sheet, 'ID');
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIdx] === data.activityId) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex);
        return createSuccessResponse({ deleted: true, activityId: data.activityId });
      } else {
        return createErrorResponse('Activity not found');
      }
      
    } else if (action === 'setActivityDeadline') {
      sheet = ss.getSheetByName('Activities');
      const idIdx = getColumnIndex(sheet, 'ID');
      const deadlineIdx = getColumnIndex(sheet, 'Deadline');
      const values = sheet.getDataRange().getValues();
      let updated = false;
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIdx] === data.activityId) {
          sheet.getRange(i + 1, deadlineIdx + 1).setValue(data.deadline || '');
          updated = true;
          break;
        }
      }
      if (updated) {
        return createSuccessResponse({ updated: true, activityId: data.activityId, deadline: data.deadline });
      } else {
        return createErrorResponse('Activity not found');
      }
      
    } else if (action === 'updateStudentPassword') {
      sheet = ss.getSheetByName('Students');
      const idIdx = getColumnIndex(sheet, 'ID');
      const passIdx = getColumnIndex(sheet, 'Password');
      const passTimeIdx = getColumnIndex(sheet, 'PasswordTimestamp');
      
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIdx] === data.studentId && String(values[i][passIdx]) === data.currentPassword) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, passIdx + 1).setValue(data.newPassword);
        sheet.getRange(rowIndex, passTimeIdx + 1).setValue(new Date().toISOString());
        return createSuccessResponse({ updated: true });
      } else {
        return createErrorResponse('Contraseña actual incorrecta');
      }
      
    } else if (action === 'adminUpdateStudentPassword') {
      sheet = ss.getSheetByName('Students');
      const idIdx = getColumnIndex(sheet, 'ID');
      const passIdx = getColumnIndex(sheet, 'Password');
      const passTimeIdx = getColumnIndex(sheet, 'PasswordTimestamp');
      
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIdx] === data.studentId) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, passIdx + 1).setValue(data.newPassword);
        sheet.getRange(rowIndex, passTimeIdx + 1).setValue(new Date().toISOString());
        return createSuccessResponse({ updated: true });
      } else {
        return createErrorResponse('Estudiante no encontrado');
      }
      
    } else if (action === 'verifyRolePassword') {
      const props = PropertiesService.getScriptProperties();
      const role = data.role; // 'admin' or 'tesorera'
      const defaultPass = role === 'admin' ? '9999' : '2627';
      const storedPass = props.getProperty(role + 'Password') || defaultPass;
      
      if (storedPass === data.password) {
        return createSuccessResponse({ valid: true });
      } else {
        return createSuccessResponse({ valid: false });
      }
      
    } else if (action === 'updateRolePassword') {
      const props = PropertiesService.getScriptProperties();
      const role = data.role; // 'admin' or 'tesorera'
      
      // Verify old password
      const defaultPass = role === 'admin' ? '9999' : '2627';
      const storedPass = props.getProperty(role + 'Password') || defaultPass;
      
      if (storedPass !== data.oldPassword) {
        return createErrorResponse('Contraseña actual incorrecta');
      }
      
      props.setProperty(role + 'Password', data.newPassword);
      return createSuccessResponse({ updated: true });
      
    } else {
      return createErrorResponse('Action not supported');
    }
    
  } catch (err) {
    return createErrorResponse(err.toString());
  }
}

function migrarContrasenas1234() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return;
  const passIdx = getColumnIndex(sheet, 'Password');
  const passTimeIdx = getColumnIndex(sheet, 'PasswordTimestamp');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    sheet.getRange(i + 1, passIdx + 1).setValue('1234');
    sheet.getRange(i + 1, passTimeIdx + 1).setValue(new Date().toISOString());
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

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
}
