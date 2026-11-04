using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class UpdateCommand
{
    private readonly ICipService _cip;
    public UpdateCommand(ICipService cip) { _cip = cip; }

    public int Invoke(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: engineering-commons update <artifact>");
            return 2;
        }
        var name = args[0];
        _cip.UpdateAsync(name).GetAwaiter().GetResult();
        Console.WriteLine($"Update request for {name} submitted.");
        return 0;
    }
}
