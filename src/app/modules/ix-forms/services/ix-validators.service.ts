import { Injectable } from '@angular/core';
import {
  AbstractControl, ValidationErrors, ValidatorFn, Validators,
} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import isCidr from 'is-cidr';

@Injectable()
export default class IxValidatorsService {
  constructor(protected translate: TranslateService) {}

  withMessage(validatorFn: ValidatorFn, errorMessage: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const errors = validatorFn(control);
      if (!errors || Object.keys(errors).length === 0) {
        return null;
      }

      const errorKey = Object.keys(errors)[0];
      return {
        [errorKey]: {
          message: errorMessage,
        },
      };
    };
  }

  readonly validateOnCondition = (
    condition: (control: AbstractControl) => boolean,
    validator: ValidatorFn,
  ): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors => {
      if (condition(control)) {
        return validator(control);
      }
      return null;
    };
  };

  /**
   * This function returns a validator
   * @param errMessage The error message applied if the validator fails
   * @returns a validator function that checks if the control value
   * is valid Cidr notation ip v4 or v6
   */
  readonly ipCidrV4orCidrV6: { forProperty: 'ip'; validatorFn: () => ValidatorFn } = {
    forProperty: 'ip',
    validatorFn: (): ValidatorFn => {
      return (control: AbstractControl) => {
        if (!control.parent) {
          return null;
        }

        if (control.value === '' || control.value === undefined) {
          return null;
        }

        if (!isCidr.v4(control.value) && !isCidr.v6(control.value)) {
          return { ip: true };
        }

        return null;
      };
    },
  };

  confirmValidator(name: string, validationMessage: string): ValidatorFn {
    return Validators.compose([
      this.withMessage(
        Validators.pattern(new RegExp(`^${name}$`)),
        validationMessage,
      ),
      this.withMessage(
        Validators.required,
        validationMessage,
      ),
    ]);
  }

  /**
   * Specify simple validator function returning true for error and an error message.
   */
  customValidator(validatorFn: (control: AbstractControl) => boolean, message: string): ValidatorFn {
    return this.withMessage(
      (control) => {
        const hasError = validatorFn(control);

        if (!hasError) {
          return null;
        }

        return { customValidator: true };
      },
      message,
    );
  }
}
