namespace EngineeringCommons.Backend.Models;

public record TestEmailRequest(string? Recipient, string? Subject, string? Body);

public record AdminAlertRequest(string AlertType, string Message, string? Details);

