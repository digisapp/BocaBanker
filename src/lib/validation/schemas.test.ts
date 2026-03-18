import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupSchema,
  clientSchema,
  propertySchema,
  leadSchema,
  loanSchema,
  reviewSubmissionSchema,
  emailSchema,
} from './schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts valid signup', () => {
    const result = signupSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'Abcdef1!',
      confirm_password: 'Abcdef1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'Abcdef1!',
      confirm_password: 'Different1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password (no uppercase)', () => {
    const result = signupSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'abcdef1!',
      confirm_password: 'abcdef1!',
    });
    expect(result.success).toBe(false);
  });
});

describe('clientSchema', () => {
  it('accepts valid client', () => {
    const result = clientSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Doe',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing first name', () => {
    const result = clientSchema.safeParse({
      first_name: '',
      last_name: 'Doe',
      status: 'active',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = clientSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Doe',
      status: 'unknown',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields as empty strings', () => {
    const result = clientSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Doe',
      status: 'prospect',
      email: '',
      phone: '',
      company: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('propertySchema', () => {
  it('accepts valid property', () => {
    const result = propertySchema.safeParse({
      address: '123 Main St',
      city: 'Boca Raton',
      state: 'FL',
      zip: '33432',
      property_type: 'commercial',
      purchase_price: 2_500_000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid ZIP code', () => {
    const result = propertySchema.safeParse({
      address: '123 Main St',
      city: 'Boca Raton',
      state: 'FL',
      zip: 'ABCDE',
      property_type: 'commercial',
      purchase_price: 2_500_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative purchase price', () => {
    const result = propertySchema.safeParse({
      address: '123 Main St',
      city: 'Boca Raton',
      state: 'FL',
      zip: '33432',
      property_type: 'commercial',
      purchase_price: -100,
    });
    expect(result.success).toBe(false);
  });

  it('accepts ZIP+4 format', () => {
    const result = propertySchema.safeParse({
      address: '123 Main St',
      city: 'Boca Raton',
      state: 'FL',
      zip: '33432-1234',
      property_type: 'commercial',
      purchase_price: 1_000_000,
    });
    expect(result.success).toBe(true);
  });
});

describe('leadSchema', () => {
  it('accepts valid lead', () => {
    const result = leadSchema.safeParse({
      property_address: '456 Commerce Way',
      property_type: 'industrial',
    });
    expect(result.success).toBe(true);
  });

  it('defaults status to new', () => {
    const result = leadSchema.safeParse({
      property_address: '456 Commerce Way',
      property_type: 'office',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('new');
    }
  });

  it('rejects invalid property type', () => {
    const result = leadSchema.safeParse({
      property_address: '456 Commerce Way',
      property_type: 'spaceship',
    });
    expect(result.success).toBe(false);
  });
});

describe('loanSchema', () => {
  it('accepts valid loan', () => {
    const result = loanSchema.safeParse({
      borrower_name: 'John Smith',
      property_address: '789 Oak Ave',
      loan_amount: 500_000,
      loan_type: 'conventional',
    });
    expect(result.success).toBe(true);
  });

  it('rejects interest rate over 30%', () => {
    const result = loanSchema.safeParse({
      borrower_name: 'John Smith',
      property_address: '789 Oak Ave',
      loan_amount: 500_000,
      loan_type: 'conventional',
      interest_rate: 31,
    });
    expect(result.success).toBe(false);
  });
});

describe('reviewSubmissionSchema', () => {
  it('accepts valid review', () => {
    const result = reviewSubmissionSchema.safeParse({
      reviewer_name: 'Jane D.',
      rating: 5,
      title: 'Amazing experience',
      body: 'Highly recommend working with this team for your mortgage needs!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rating of 0', () => {
    const result = reviewSubmissionSchema.safeParse({
      reviewer_name: 'Jane D.',
      rating: 0,
      title: 'Title',
      body: 'This is a review body text.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = reviewSubmissionSchema.safeParse({
      reviewer_name: 'Jane D.',
      rating: 6,
      title: 'Title',
      body: 'This is a review body text.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body shorter than 10 chars', () => {
    const result = reviewSubmissionSchema.safeParse({
      reviewer_name: 'Jane D.',
      rating: 5,
      title: 'Title',
      body: 'Short',
    });
    expect(result.success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('accepts valid email', () => {
    const result = emailSchema.safeParse({
      to_email: 'client@example.com',
      subject: 'Your mortgage update',
      body: 'Hello, here is your update.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing subject', () => {
    const result = emailSchema.safeParse({
      to_email: 'client@example.com',
      subject: '',
      body: 'Content here',
    });
    expect(result.success).toBe(false);
  });
});
