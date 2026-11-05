import {
    ValidatorConstraintInterface,
    ValidatorConstraint,
    ValidationArguments,
    ValidationOptions,
    registerDecorator,
    isISO8601,
    isString,
} from "class-validator";

@ValidatorConstraint({ name: "IsPeriod", async: false })
class IsPeriodConstraint implements ValidatorConstraintInterface {
    public validate(value: unknown, args: ValidationArguments): boolean {
        const [periods] = args.constraints as [Periods];
        const period = isString(value) && Object.prototype.hasOwnProperty.call(periods, value) ? periods[value] : undefined;
        const object = args.object as UnknownObject;

        if (period) {
            const from = object[period.from];
            const to = object[period.to];
            const pattern = period.dateOnly ? /^\d{4}-\d{2}-\d{2}$/ : /T\d{2}:\d{2}:00(?:\.0{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
            const valid = [from, to].every(
                (date) => typeof date === "string" && pattern.test(date) && isISO8601(date, { strict: true }),
            );
            const exclusive = Object.values(periods).every(
                (other) => other === period || (object[other.from] === undefined && object[other.to] === undefined),
            );

            return valid && exclusive && Date.parse(to as string) > Date.parse(from as string);
        } else {
            return false;
        }
    }
}

export function IsPeriod(periods: Periods, options?: ValidationOptions): PropertyDecorator {
    return (target, propertyName) => {
        registerDecorator({
            name: "IsPeriod",
            propertyName: propertyName.toString(),
            validator: IsPeriodConstraint,
            target: target.constructor,
            constraints: [periods],
            options,
        });
    };
}
