import {
    ValidatorConstraintInterface,
    ValidatorConstraint,
    ValidationArguments,
    ValidationOptions,
    registerDecorator,
    validateSync,
    isObject,
} from "class-validator";
import { ClassConstructor, plainToInstance } from "class-transformer";

@ValidatorConstraint({ name: "ValidateByType", async: false })
class ValidateByTypeConstraint implements ValidatorConstraintInterface {
    public validate(value: unknown, args: ValidationArguments): boolean {
        const [discriminator, types, property] = args.constraints as [
            string,
            Record<string, ClassConstructor<object>>,
            string | undefined,
        ];
        const type = (args.object as UnknownObject)[discriminator] as string;
        const payload = property && isObject(value) ? (value as UnknownObject)[property] : value;

        if (property && payload === undefined) {
            return true;
        } else if (!isObject(payload)) {
            return false;
        } else if (Object.prototype.hasOwnProperty.call(types, type)) {
            const entity = plainToInstance(types[type], payload);

            return validateSync(entity, { forbidNonWhitelisted: true, whitelist: true }).length === 0;
        } else {
            return true;
        }
    }
}

export function ValidateByType(
    discriminator: string,
    types: Record<string, ClassConstructor<object>>,
    property?: string,
    options?: ValidationOptions,
): PropertyDecorator {
    return (target, propertyName) => {
        registerDecorator({
            name: "ValidateByType",
            target: target.constructor,
            propertyName: propertyName.toString(),
            constraints: [discriminator, types, property],
            validator: ValidateByTypeConstraint,
            options,
        });
    };
}
