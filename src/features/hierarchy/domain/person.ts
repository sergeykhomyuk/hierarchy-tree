import type { EmailAddress } from './emailAddress';
import type { PersonIdentifier } from './personIdentifier';

export type Person = {
  readonly id: PersonIdentifier;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: EmailAddress;
  readonly managerId?: PersonIdentifier;
  readonly photo?: string;
};
