const { createError } = require('../middleware/errorHandler');

class ValidationService {
  constructor() {
    this.validationRules = {
      // User validation
      user: {
        email: {
          required: true,
          type: 'email',
          minLength: 5,
          maxLength: 255,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
          required: true,
          minLength: 8,
          maxLength: 128,
          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
        },
        firstName: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: /^[a-zA-Z\s]+$/
        },
        lastName: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: /^[a-zA-Z\s]+$/
        },
        phone: {
          required: false,
          pattern: /^[\+]?[0-9\s\-\(\)]{8,15}$/
        },
        role: {
          required: true,
          enum: ['admin', 'manager', 'employee', 'user']
        }
      },

      // Employee validation
      employee: {
        firstName: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: /^[a-zA-Z\s]+$/
        },
        lastName: {
          required: true,
          minLength: 2,
          maxLength: 50,
          pattern: /^[a-zA-Z\s]+$/
        },
        email: {
          required: true,
          type: 'email',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        phone: {
          required: false,
          pattern: /^[\+]?[0-9\s\-\(\)]{8,15}$/
        },
        address: {
          required: false,
          maxLength: 255
        },
        position: {
          required: true,
          maxLength: 100
        },
        hourlyRate: {
          required: true,
          type: 'number',
          min: 0,
          max: 1000
        },
        startDate: {
          required: true,
          type: 'date'
        },
        status: {
          required: true,
          enum: ['Aktiv', 'Jo aktiv', 'Pushim', 'Pushuar']
        }
      },

      // Contract validation
      contract: {
        contractNumber: {
          required: true,
          pattern: /^[A-Z0-9\-]+$/,
          minLength: 5,
          maxLength: 20
        },
        siteName: {
          required: true,
          maxLength: 255
        },
        company: {
          required: true,
          maxLength: 255
        },
        startDate: {
          required: true,
          type: 'date'
        },
        finishDate: {
          required: true,
          type: 'date',
          custom: (value, data) => {
            if (new Date(value) <= new Date(data.startDate)) {
              throw createError('VALIDATION_ERROR', null, 'Data e përfundimit duhet të jetë pas datës së fillimit');
            }
          }
        },
        value: {
          required: true,
          type: 'number',
          min: 0
        },
        status: {
          required: true,
          enum: ['Ne progres', 'Përfunduar', 'Pezulluar', 'Anulluar']
        }
      },

      // Payment validation
      payment: {
        employeeId: {
          required: true,
          type: 'number'
        },
        weekLabel: {
          required: true,
          pattern: /^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/
        },
        grossAmount: {
          required: true,
          type: 'number',
          min: 0
        },
        netAmount: {
          required: true,
          type: 'number',
          min: 0
        },
        taxAmount: {
          required: true,
          type: 'number',
          min: 0
        },
        isPaid: {
          required: true,
          type: 'boolean'
        }
      },

      // Task validation
      task: {
        title: {
          required: true,
          maxLength: 255
        },
        description: {
          required: false,
          maxLength: 1000
        },
        assignedTo: {
          required: true,
          type: 'number'
        },
        assignedBy: {
          required: true,
          type: 'number'
        },
        dueDate: {
          required: false,
          type: 'date'
        },
        priority: {
          required: true,
          enum: ['low', 'medium', 'high', 'urgent']
        },
        status: {
          required: true,
          enum: ['pending', 'ongoing', 'completed', 'cancelled']
        }
      },

      // Expense validation
      expense: {
        expenseType: {
          required: true,
          maxLength: 100
        },
        description: {
          required: true,
          maxLength: 500
        },
        gross: {
          required: true,
          type: 'number',
          min: 0
        },
        net: {
          required: true,
          type: 'number',
          min: 0
        },
        vat: {
          required: true,
          type: 'number',
          min: 0
        },
        date: {
          required: true,
          type: 'date'
        },
        contractId: {
          required: false,
          type: 'number'
        },
        paid: {
          required: true,
          type: 'boolean'
        }
      },

      // Work hours validation
      workHours: {
        employeeId: {
          required: true,
          type: 'number'
        },
        date: {
          required: true,
          type: 'date'
        },
        hours: {
          required: true,
          type: 'number',
          min: 0,
          max: 24
        },
        rate: {
          required: true,
          type: 'number',
          min: 0
        },
        site: {
          required: false,
          maxLength: 255
        },
        notes: {
          required: false,
          maxLength: 500
        }
      }
    };
  }

  // Validizo një objekt sipas rules
  validate(data, schema, options = {}) {
    const errors = [];
    const schemaRules = this.validationRules[schema];

    if (!schemaRules) {
      throw createError('VALIDATION_ERROR', null, `Schema '${schema}' nuk ekziston`);
    }

    // Kontrollo fields e detyrueshme
    for (const [field, rules] of Object.entries(schemaRules)) {
      const value = data[field];
      
      // Kontrollo nëse është i detyrueshëm
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `Fusha '${field}' është e detyrueshme`,
          code: 'VALIDATION_REQUIRED_FIELD'
        });
        continue;
      }

      // Skip nëse vlera është undefined dhe nuk është e detyrueshme
      if (value === undefined || value === null) {
        continue;
      }

      // Validizo tipin
      if (rules.type) {
        const typeError = this.validateType(value, rules.type, field);
        if (typeError) {
          errors.push(typeError);
          continue;
        }
      }

      // Validizo gjatësinë
      if (rules.minLength && String(value).length < rules.minLength) {
        errors.push({
          field,
          message: `Fusha '${field}' duhet të ketë minimum ${rules.minLength} karaktere`,
          code: 'VALIDATION_INVALID_LENGTH'
        });
      }

      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors.push({
          field,
          message: `Fusha '${field}' duhet të ketë maksimum ${rules.maxLength} karaktere`,
          code: 'VALIDATION_INVALID_LENGTH'
        });
      }

      // Validizo vlerat numerike
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push({
            field,
            message: `Fusha '${field}' duhet të jetë minimum ${rules.min}`,
            code: 'VALIDATION_INVALID_RANGE'
          });
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push({
            field,
            message: `Fusha '${field}' duhet të jetë maksimum ${rules.max}`,
            code: 'VALIDATION_INVALID_RANGE'
          });
        }
      }

      // Validizo pattern
      if (rules.pattern && !rules.pattern.test(String(value))) {
        errors.push({
          field,
          message: `Fusha '${field}' nuk ka formatin e duhur`,
          code: 'VALIDATION_INVALID_FORMAT'
        });
      }

      // Validizo enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `Fusha '${field}' duhet të jetë një nga: ${rules.enum.join(', ')}`,
          code: 'VALIDATION_INVALID_ENUM'
        });
      }

      // Validizo custom rules
      if (rules.custom) {
        try {
          rules.custom(value, data);
        } catch (error) {
          errors.push({
            field,
            message: error.message,
            code: 'VALIDATION_CUSTOM_ERROR'
          });
        }
      }
    }

    // Kontrollo fields shtesë që nuk janë në schema
    if (!options.allowExtraFields) {
      for (const field of Object.keys(data)) {
        if (!schemaRules[field]) {
          errors.push({
            field,
            message: `Fusha '${field}' nuk është e lejuar`,
            code: 'VALIDATION_EXTRA_FIELD'
          });
        }
      }
    }

    if (errors.length > 0) {
      throw createError('VALIDATION_ERROR', {
        fields: errors,
        schema,
        data: Object.keys(data)
      });
    }

    return true;
  }

  // Validizo tipin e të dhënave
  validateType(value, type, field) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: `Fusha '${field}' duhet të jetë tekst`,
            code: 'VALIDATION_INVALID_TYPE'
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: `Fusha '${field}' duhet të jetë numër`,
            code: 'VALIDATION_INVALID_TYPE'
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: `Fusha '${field}' duhet të jetë boolean`,
            code: 'VALIDATION_INVALID_TYPE'
          };
        }
        break;

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(String(value))) {
          return {
            field,
            message: `Fusha '${field}' duhet të jetë email i vlefshëm`,
            code: 'VALIDATION_INVALID_EMAIL'
          };
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            field,
            message: `Fusha '${field}' duhet të jetë datë e vlefshme`,
            code: 'VALIDATION_INVALID_DATE'
          };
        }
        break;

      case 'phone':
        const phonePattern = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
        if (!phonePattern.test(String(value))) {
          return {
            field,
            message: `Fusha '${field}' duhet të jetë numër telefoni i vlefshëm`,
            code: 'VALIDATION_INVALID_PHONE'
          };
        }
        break;
    }

    return null;
  }

  // Validizo ID
  validateId(id, fieldName = 'id') {
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      throw createError('VALIDATION_ERROR', {
        field: fieldName,
        value: id
      }, `${fieldName} duhet të jetë numër pozitiv`);
    }
    return Number(id);
  }

  // Validizo email
  validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      throw createError('VALIDATION_INVALID_EMAIL', {
        email
      });
    }
    return email.toLowerCase().trim();
  }

  // Validizo password
  validatePassword(password) {
    if (!password || password.length < 8) {
      throw createError('VALIDATION_ERROR', null, 'Fjalëkalimi duhet të ketë minimum 8 karaktere');
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordPattern.test(password)) {
      throw createError('VALIDATION_ERROR', null, 'Fjalëkalimi duhet të përmbajë shkronja të vogla, të mëdha, numra dhe karaktere speciale');
    }

    return password;
  }

  // Validizo date range
  validateDateRange(startDate, endDate, startField = 'startDate', endField = 'endDate') {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw createError('VALIDATION_ERROR', null, `Data e fillimit '${startField}' nuk është e vlefshme`);
    }

    if (isNaN(end.getTime())) {
      throw createError('VALIDATION_ERROR', null, `Data e përfundimit '${endField}' nuk është e vlefshme`);
    }

    if (start >= end) {
      throw createError('VALIDATION_ERROR', null, 'Data e përfundimit duhet të jetë pas datës së fillimit');
    }

    return { start, end };
  }

  // Validizo amount
  validateAmount(amount, fieldName = 'amount') {
    const num = Number(amount);
    if (isNaN(num) || num < 0) {
      throw createError('VALIDATION_ERROR', {
        field: fieldName,
        value: amount
      }, `${fieldName} duhet të jetë numër pozitiv`);
    }
    return num;
  }

  // Validizo pagination
  validatePagination(page = 1, limit = 10, maxLimit = 100) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(maxLimit, Math.max(1, Number(limit) || 10));

    return {
      page: pageNum,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum
    };
  }

  // Validizo search query
  validateSearchQuery(query, maxLength = 100) {
    if (!query || typeof query !== 'string') {
      return '';
    }

    const sanitized = query.trim().substring(0, maxLength);
    return sanitized.replace(/[<>]/g, ''); // Basic XSS protection
  }

  // Validizo file upload
  validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    if (!file) {
      throw createError('FILE_UPLOAD_ERROR', null, 'Nuk u ngarkua asnjë file');
    }

    if (file.size > maxSize) {
      throw createError('FILE_TOO_LARGE', {
        size: file.size,
        maxSize
      });
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw createError('FILE_INVALID_TYPE', {
        type: file.mimetype,
        allowedTypes
      });
    }

    return true;
  }

  // Sanitize data
  sanitize(data, schema) {
    const sanitized = {};
    const schemaRules = this.validationRules[schema];

    if (!schemaRules) {
      return data;
    }

    for (const [field, rules] of Object.entries(schemaRules)) {
      if (data[field] !== undefined) {
        let value = data[field];

        // Sanitize string values
        if (typeof value === 'string') {
          value = value.trim();
          
          // Remove HTML tags
          value = value.replace(/<[^>]*>/g, '');
          
          // Limit length
          if (rules.maxLength) {
            value = value.substring(0, rules.maxLength);
          }
        }

        // Convert types
        if (rules.type === 'number' && typeof value === 'string') {
          value = Number(value);
        }

        if (rules.type === 'boolean' && typeof value === 'string') {
          value = value.toLowerCase() === 'true';
        }

        if (rules.type === 'email' && typeof value === 'string') {
          value = value.toLowerCase().trim();
        }

        sanitized[field] = value;
      }
    }

    return sanitized;
  }

  // Shto custom validation rule
  addCustomRule(schema, field, rule) {
    if (!this.validationRules[schema]) {
      this.validationRules[schema] = {};
    }

    if (!this.validationRules[schema][field]) {
      this.validationRules[schema][field] = {};
    }

    this.validationRules[schema][field] = {
      ...this.validationRules[schema][field],
      ...rule
    };
  }

  // Merr validation rules për një schema
  getValidationRules(schema) {
    return this.validationRules[schema] || {};
  }

  // Kontrollo nëse një field është i detyrueshëm
  isRequired(schema, field) {
    const rules = this.validationRules[schema];
    return rules && rules[field] && rules[field].required;
  }
}

module.exports = ValidationService; 