using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface IReviewRepository
{
    void Add(Review r);
    Review? Get(string id);
    IEnumerable<Review> List();
}
