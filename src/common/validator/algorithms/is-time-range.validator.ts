import {
    ValidatorConstraintInterface,
    ValidatorConstraint,
    ValidationArguments,
    ValidationOptions,
    registerDecorator,
} from "class-validator";

@ValidatorConstraint({ name: "IsTimeRange", async: false })
class IsTimeRangeConstraint implements ValidatorConstraintInterface {
    public validate(value: unknown, args: ValidationArguments): boolean {
        const [from] = args.constraints as [string];
        const start = (args.object as UnknownObject)[from];
        const pattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        return (
            typeof start === "string" &&
            typeof value === "string" &&
            pattern.test(start) &&
            pattern.test(value) &&
            start < value
        );
    }
}

export function IsTimeRange(from: string, options?: ValidationOptions): PropertyDecorator {
    return (target, propertyName) => {
        registerDecorator({
            name: "IsTimeRange",
            propertyName: propertyName.toString(),
            validator: IsTimeRangeConstraint,
            target: target.constructor,
            constraints: [from],
            options,
        });
    };
}
