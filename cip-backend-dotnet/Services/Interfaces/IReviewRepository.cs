using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface IReviewRepository
{
    void Add(Review r);
    Review? Get(string id);
    IEnumerable<Review> List();
}
