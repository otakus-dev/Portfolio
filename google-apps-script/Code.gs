function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanLine(value, maxLength) {
  return String(value || '').replace(/[\r\n\0]/g, ' ').trim().slice(0, maxLength);
}

function doPost(event) {
  try {
    const data = JSON.parse((event.postData && event.postData.contents) || '{}');
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty('FORM_SECRET');
    const recipient = properties.getProperty('CONTACT_TO');

    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'UNAUTHORIZED' });
    }
    if (!recipient) return jsonResponse({ ok: false, error: 'RECIPIENT_NOT_CONFIGURED' });

    const name = cleanLine(data.name, 80);
    const email = cleanLine(data.email, 160).toLowerCase();
    const phone = cleanLine(data.phone, 30);
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneIsValid = /^[+0-9 ()-]{7,30}$/.test(phone);
    if (!name || !emailIsValid || !phoneIsValid || data.consent !== true) {
      return jsonResponse({ ok: false, error: 'INVALID_DATA' });
    }

    const submittedAt = Utilities.formatDate(new Date(), 'Asia/Yekaterinburg', 'dd.MM.yyyy HH:mm');
    const body = [
      'Новая заявка с сайта-портфолио', '',
      'Имя: ' + name,
      'Почта: ' + email,
      'Телефон: ' + phone,
      'Отправлено: ' + submittedAt,
      '',
      'Посетитель подтвердил согласие на обработку указанных персональных данных для ответа на обращение.'
    ].join('\n');

    MailApp.sendEmail({
      to: recipient,
      subject: 'Новая заявка с сайта — ' + name,
      body: body,
      replyTo: email,
      name: 'Сайт-портфолио Андрея'
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'SEND_FAILED' });
  }
}
