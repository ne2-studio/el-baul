namespace ElBaul.Ports.Input;

public readonly record struct Result
{
    private readonly ApplicationError _error;

    private Result(bool isSuccess, ApplicationError error)
    {
        IsSuccess = isSuccess;
        _error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public ApplicationError Error =>
        IsFailure ? _error : throw new InvalidOperationException("There is no error for a successful result.");

    public static Result Success() => new(true, default);

    public static Result<T> Success<T>(T value) => Result<T>.Success(value);

    public static Result Failure(ApplicationError error) => new(false, error);

    public static Result<T> Failure<T>(ApplicationError error) => Result<T>.Failure(error);
}

public readonly record struct Result<T>
{
    private readonly T? _value;
    private readonly ApplicationError _error;

    private Result(bool isSuccess, T? value, ApplicationError error)
    {
        IsSuccess = isSuccess;
        _value = value;
        _error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public T Value =>
        IsSuccess ? _value! : throw new InvalidOperationException("There is no value for a failed result.");

    public ApplicationError Error =>
        IsFailure ? _error : throw new InvalidOperationException("There is no error for a successful result.");

    public static Result<T> Success(T value) => new(true, value, default);

    public static Result<T> Failure(ApplicationError error) => new(false, default, error);

    public static implicit operator Result<T>(T value) => Success(value);
}
