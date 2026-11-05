import { ValidateIf, ValidationOptions } from "class-validator";

export function IsOptionalUnless(property: string, values: unknown[], options?: ValidationOptions): PropertyDecorator {
    return ValidateIf(
        (object: UnknownObject, value: unknown) =>
            values.includes(object[property]) || (value !== undefined && value !== null),
        options,
    );
}
