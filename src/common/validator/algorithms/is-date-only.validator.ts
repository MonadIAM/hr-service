import {
    ValidatorConstraintInterface,
    ValidatorConstraint,
    ValidationArguments,
    ValidationOptions,
    registerDecorator,
    isISO8601,
} from "class-validator";

@ValidatorConstraint({ name: "IsDateOnly", async: false })
class IsDateOnlyConstraint implements ValidatorConstraintInterface {
    public validate(value: unknown, _: ValidationArguments): boolean {
        return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && isISO8601(value, { strict: true });
    }

    public defaultMessage(args: ValidationArguments): string {
        return `Value of field "${String(args.property)}" must be a valid calendar date in YYYY-MM-DD format.`;
    }
}

export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
    return (target, propertyName) => {
        registerDecorator({
            name: "IsDateOnly",
            target: target.constructor,
            propertyName: propertyName.toString(),
            validator: IsDateOnlyConstraint,
            options,
        });
    };
}
